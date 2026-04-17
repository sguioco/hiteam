import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SaveFormat, manipulateAsync } from "expo-image-manipulator";
import { AppState, Image, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../components/ui/text";
import { CameraView, useCameraPermissions } from "expo-camera";
import MapView, { Circle, Marker } from "react-native-maps";
import type { AttendanceStatusResponse, BiometricPolicyResponse } from "@smart/types";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  bootstrapDemoDevice,
  loadAttendanceStatus,
  loadBiometricPolicy,
  submitAttendanceAction,
  verifyBiometricWithArtifacts,
} from "../../lib/api";
import {
  getDirectionalIconStyle,
  type AppLanguage,
  useI18n,
} from "../../lib/i18n";
import {
  capturePreciseAttendanceLocation,
  isPreciseLocationError,
  type AttendanceLocationSnapshot,
} from "../../lib/location";
import { peekScreenCache, readScreenCache, writeScreenCache } from "../../lib/screen-cache";
import {
  TODAY_SCREEN_CACHE_KEY,
  TODAY_SCREEN_CACHE_TTL_MS,
  warmTodayScreenCache,
  type TodayScreenCacheValue,
} from "../../lib/workspace-cache";
import { PressableScale } from "../../components/ui/pressable-scale";
import { BrandWordmark } from "./brand-wordmark";

type AttendanceCaptureScreenProps = {
  action: "check-in" | "check-out";
};

type LocationCheckState =
  | {
      state: "idle" | "running";
      snapshot: null;
      distanceMeters: null;
      errorMessage: null;
    }
  | {
      state: "ready" | "outside";
      snapshot: AttendanceLocationSnapshot;
      distanceMeters: number;
      errorMessage: null;
    }
  | {
      state: "error";
      snapshot: AttendanceLocationSnapshot | null;
      distanceMeters: number | null;
      errorMessage: string;
    };

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance: number, language: AppLanguage) {
  if (distance < 1000) {
    return `${Math.round(distance)} ${language === "ru" ? "м" : "m"}`;
  }

  return `${(distance / 1000).toFixed(1)} ${language === "ru" ? "км" : "km"}`;
}

export function AttendanceCaptureScreen({
  action,
}: AttendanceCaptureScreenProps) {
  const router = useRouter();
  const { language, t } = useI18n();
  const initialTodaySnapshot = useMemo(
    () =>
      peekScreenCache<TodayScreenCacheValue>(
        TODAY_SCREEN_CACHE_KEY,
        TODAY_SCREEN_CACHE_TTL_MS,
      ),
    [],
  );
  const directionalIconStyle = useMemo(
    () => getDirectionalIconStyle(language),
    [language],
  );
  const cameraRef = useRef<CameraView | null>(null);
  const permissionRefreshTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const completionGuardRef = useRef(false);
  const locationCheckRequestRef = useRef(0);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(
    !initialTodaySnapshot?.value.attendanceStatus,
  );
  const [faceProcessing, setFaceProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPromptOpen, setCameraPromptOpen] = useState(false);
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof loadAttendanceStatus>
  > | null>(initialTodaySnapshot?.value.attendanceStatus ?? null);
  const [biometricPolicy, setBiometricPolicy] =
    useState<BiometricPolicyResponse | null>(null);
  const [biometricVerificationId, setBiometricVerificationId] = useState<
    string | null
  >(null);
  const [capturedArtifact, setCapturedArtifact] = useState<string | null>(null);
  const [locationCheck, setLocationCheck] = useState<LocationCheckState>({
    state: "idle",
    snapshot: null,
    distanceMeters: null,
    errorMessage: null,
  });

  const isCheckIn = action === "check-in";
  const intent = isCheckIn ? "attendance-check-in" : "attendance-check-out";
  const copy = {
    title: isCheckIn ? t("workspace.checkIn") : t("departure.sayBye"),
    cameraPermission: t("biometricMobile.cameraPermission"),
    cameraPermissionCta: t("biometricMobile.cameraPermissionCta"),
    cameraPermissionSettingsCta: t(
      "biometricMobile.cameraPermissionSettingsCta",
    ),
    cameraPromptTitle: t("attendanceCapture.cameraPromptTitle"),
    cameraPromptBody: t("attendanceCapture.cameraPromptBody"),
    cameraPromptConfirm: t("attendanceCapture.cameraPromptConfirm"),
    cameraPromptCancel: t("attendanceCapture.cameraPromptCancel"),
    locationRunning: t("attendanceCapture.locationRunning"),
    locationReady: t("attendanceCapture.locationReady"),
    locationOutsideTitle: t("attendanceCapture.locationOutsideTitle"),
    locationOutsideBody: t("attendanceCapture.locationOutsideBody"),
    retryLocation: t("attendanceCapture.retryLocation"),
    captureFace: isCheckIn ? t("workspace.checkIn") : t("departure.sayBye"),
    verifyingFace: t("attendanceCapture.verifyingFace"),
    enrollingFace: t("attendanceCapture.enrollingFace"),
    faceEnrollComplete: t("attendanceCapture.faceEnrollComplete"),
    processingAction: isCheckIn
      ? t("arrival.processing")
      : t("departure.processing"),
    faceReady: isCheckIn
      ? t("attendanceCapture.faceReadyCheckIn")
      : t("attendanceCapture.faceReadyCheckOut"),
    mapTitle: t("attendanceCapture.mapTitle"),
    targetLabel: t("attendanceCapture.targetLabel"),
    currentLabel: t("attendanceCapture.currentLabel"),
    outOfZoneDistance: t("attendanceCapture.outOfZoneDistance", {
      distance: "{distance}",
    }),
  };

  const shiftTime = useMemo(() => {
    if (!status?.shift) {
      return "—";
    }

    return `${new Date(status.shift.startsAt).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${new Date(status.shift.endsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  }, [status]);

  const cameraStatusText = useMemo(() => {
    if (!permission?.granted) {
      return copy.cameraPermission;
    }

    if (
      loading ||
      locationCheck.state === "idle" ||
      locationCheck.state === "running"
    ) {
      return copy.locationRunning;
    }

    if (locationCheck.state === "ready") {
      return copy.locationReady;
    }

    if (locationCheck.state === "outside") {
      return copy.locationOutsideTitle;
    }

    return locationCheck.errorMessage ?? copy.retryLocation;
  }, [copy, loading, locationCheck, permission?.granted]);

  const mapRegion = useMemo(() => {
    if (!status?.location || !locationCheck.snapshot) {
      return null;
    }

    const targetLatitude = status.location.latitude;
    const targetLongitude = status.location.longitude;
    const currentLatitude = locationCheck.snapshot.latitude;
    const currentLongitude = locationCheck.snapshot.longitude;

    return {
      latitude: (targetLatitude + currentLatitude) / 2,
      longitude: (targetLongitude + currentLongitude) / 2,
      latitudeDelta: Math.max(
        Math.abs(targetLatitude - currentLatitude) * 2.2,
        0.008,
      ),
      longitudeDelta: Math.max(
        Math.abs(targetLongitude - currentLongitude) * 2.2,
        0.008,
      ),
    };
  }, [locationCheck.snapshot, status?.location]);

  const primaryButtonLabel = useMemo(() => {
    if (submitting) {
      return copy.processingAction;
    }

    if (faceProcessing) {
      return biometricPolicy?.enrollmentStatus === "ENROLLED"
        ? copy.verifyingFace
        : copy.enrollingFace;
    }

    if (biometricVerificationId && locationCheck.state !== "ready") {
      return copy.retryLocation;
    }

    return copy.captureFace;
  }, [
    biometricPolicy?.enrollmentStatus,
    biometricVerificationId,
    copy,
    faceProcessing,
    locationCheck.state,
    submitting,
  ]);

  const primaryButtonDisabled =
    submitting ||
    faceProcessing ||
    locationCheck.state === "running" ||
    loading;

  function hasInvalidAttendanceState(
    nextStatus: Awaited<ReturnType<typeof loadAttendanceStatus>>,
  ) {
    return isCheckIn
      ? nextStatus.attendanceState !== "not_checked_in"
      : nextStatus.attendanceState === "not_checked_in" ||
          nextStatus.attendanceState === "checked_out";
  }

  function applyLatestStatus(
    nextStatus: Awaited<ReturnType<typeof loadAttendanceStatus>>,
  ) {
    setStatus(nextStatus);

    if (hasInvalidAttendanceState(nextStatus)) {
      router.replace("/today" as never);
      return null;
    }

    return nextStatus;
  }

  function hasFreshLocationCheck(state: LocationCheckState) {
    if (state.state !== "ready") {
      return false;
    }

    const capturedAtMs = Date.parse(state.snapshot.capturedAt);
    return Number.isFinite(capturedAtMs)
      ? Date.now() - capturedAtMs <= 30_000
      : false;
  }

  function redirectToBiometricSetup() {
    setCapturedArtifact(null);
    setError(
      language === "ru"
        ? "Биометрия не настроена. Завершите первичную регистрацию лица перед отметкой."
        : "Biometric enrollment is not configured yet. Complete the initial face setup before attendance.",
    );
    router.replace({
      pathname: "/biometric" as never,
      params: {
        mode: "enroll",
        returnTo: "/today",
      },
    });
  }

  async function refresh(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      void bootstrapDemoDevice().catch(() => undefined);
      const [nextStatus, nextBiometricPolicy] = await Promise.all([
        loadAttendanceStatus(),
        loadBiometricPolicy(),
      ]);
      setBiometricPolicy(nextBiometricPolicy);

      const activeStatus = applyLatestStatus(nextStatus);
      if (!activeStatus) {
        return;
      }

      if (nextBiometricPolicy.enrollmentStatus !== "ENROLLED") {
        redirectToBiometricSetup();
        return;
      }

      void runLocationCheck(activeStatus);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : isCheckIn
            ? t("arrival.loadError")
            : t("departure.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cached =
        initialTodaySnapshot ??
        (await readScreenCache<TodayScreenCacheValue>(
          TODAY_SCREEN_CACHE_KEY,
          TODAY_SCREEN_CACHE_TTL_MS,
        ));

      const cachedStatus = cached?.value.attendanceStatus ?? null;
      if (cachedStatus && !cancelled) {
        setStatus(cachedStatus);
        setLoading(false);
        void runLocationCheck(cachedStatus);
      }

      await refresh({ silent: Boolean(cachedStatus) });
    })();

    return () => {
      cancelled = true;
    };
  }, [initialTodaySnapshot]);

  async function syncCameraPermission() {
    try {
      const nextPermission = await getPermission();
      if (nextPermission.granted) {
        setError(null);
      }
    } catch {
      // Ignore background permission refresh errors.
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        return;
      }

      void syncCameraPermission();
      void refresh();
      if (permissionRefreshTimerRef.current) {
        clearTimeout(permissionRefreshTimerRef.current);
      }
      permissionRefreshTimerRef.current = setTimeout(() => {
        void syncCameraPermission();
      }, 450);
    });

    return () => {
      subscription.remove();
      if (permissionRefreshTimerRef.current) {
        clearTimeout(permissionRefreshTimerRef.current);
      }
    };
  }, [getPermission]);

  useEffect(() => {
    if (permission?.granted && cameraPromptOpen) {
      setCameraPromptOpen(false);
    }
  }, [cameraPromptOpen, permission?.granted]);

  async function ensurePermission() {
    if (permission?.granted) {
      return true;
    }

    const result = await requestPermission();
    if (!result.granted) {
      setError(t("biometric.permissionRequired"));
    }

    return result.granted;
  }

  async function runLocationCheck(baseStatus = status) {
    if (!baseStatus?.location) {
      return null;
    }

    const requestId = locationCheckRequestRef.current + 1;
    locationCheckRequestRef.current = requestId;
    setLocationCheck({
      state: "running",
      snapshot: null,
      distanceMeters: null,
      errorMessage: null,
    });
    setError(null);

    try {
      const snapshot = await capturePreciseAttendanceLocation();
      if (locationCheckRequestRef.current !== requestId) {
        return;
      }

      const nextDistanceMeters = distanceMeters(
        snapshot.latitude,
        snapshot.longitude,
        baseStatus.location.latitude,
        baseStatus.location.longitude,
      );

      if (nextDistanceMeters > baseStatus.location.radiusMeters) {
        const nextState = {
          state: "outside",
          snapshot,
          distanceMeters: nextDistanceMeters,
          errorMessage: null,
        } as const;
        setLocationCheck(nextState);
        return nextState;
      }

      const nextState = {
        state: "ready",
        snapshot,
        distanceMeters: nextDistanceMeters,
        errorMessage: null,
      } as const;
      setLocationCheck(nextState);
      setMessage(
        isCheckIn
          ? t("arrival.locationCaptured", { accuracy: snapshot.accuracyMeters })
          : t("departure.locationCaptured", {
              accuracy: snapshot.accuracyMeters,
            }),
      );
      return nextState;
    } catch (nextError) {
      if (locationCheckRequestRef.current !== requestId) {
        return null;
      }

      let errorMessage = isCheckIn
        ? t("arrival.locationCaptureFailed")
        : t("departure.locationCaptureFailed");

      if (isPreciseLocationError(nextError)) {
        if (nextError.code === "LOCATION_PERMISSION_REQUIRED") {
          errorMessage = isCheckIn
            ? t("arrival.locationPermissionRequired")
            : t("departure.locationPermissionRequired");
        } else if (nextError.code === "PRECISE_LOCATION_REQUIRED") {
          errorMessage = isCheckIn
            ? t("arrival.locationPreciseRequired")
            : t("departure.locationPreciseRequired");
        } else if (nextError.code === "LOCATION_ACCURACY_TOO_LOW") {
          errorMessage = isCheckIn
            ? t("arrival.locationAccuracyTooLow")
            : t("departure.locationAccuracyTooLow");
        }
      } else if (nextError instanceof Error) {
        errorMessage = nextError.message;
      }

      const nextState = {
        state: "error",
        snapshot: null,
        distanceMeters: null,
        errorMessage,
      } as const;
      setLocationCheck(nextState);
      setError(errorMessage);
      return nextState;
    }
  }

  async function captureAndVerifyFace() {
    const nextStatus =
      status ?? applyLatestStatus(await loadAttendanceStatus());
    if (!nextStatus) {
      return;
    }

    const nextBiometricPolicy =
      biometricPolicy ?? (await loadBiometricPolicy().catch(() => null));
    if (!nextBiometricPolicy) {
      setError(t("biometric.policyUnavailable"));
      return;
    }

    setBiometricPolicy(nextBiometricPolicy);
    if (nextBiometricPolicy.enrollmentStatus !== "ENROLLED") {
      redirectToBiometricSetup();
      return;
    }

    const nextLocationCheck = hasFreshLocationCheck(locationCheck)
      ? locationCheck
      : await runLocationCheck(nextStatus);
    if (nextLocationCheck?.state !== "ready") {
      return;
    }

    const permissionGranted = await ensurePermission();
    if (!permissionGranted) {
      setError(t("biometric.permissionRequired"));
      return;
    }

    if (!cameraRef.current) {
      return;
    }

    setFaceProcessing(true);
    setError(null);
    setMessage(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.55,
        skipProcessing: true,
      });
      if (!picture.base64) {
        throw new Error(t("biometric.captureMissingData"));
      }

      let artifactDataUrl = `data:image/jpeg;base64,${picture.base64}`;
      let frozenArtifact = artifactDataUrl;

      if (picture.uri) {
        try {
          const optimizedPicture = await manipulateAsync(
            picture.uri,
            [{ resize: { width: 960 } }],
            {
              base64: true,
              compress: 0.65,
              format: SaveFormat.JPEG,
            },
          );

          if (optimizedPicture.base64) {
            artifactDataUrl = `data:image/jpeg;base64,${optimizedPicture.base64}`;
            frozenArtifact = optimizedPicture.uri || artifactDataUrl;
          }
        } catch {
          // Keep the original capture if local compression fails.
        }
      }

      setCapturedArtifact(frozenArtifact);
      const artifacts = [artifactDataUrl];
      const captureMetadata = {
        mode: "verify",
        captureSource: "expo-camera",
        platform: "mobile",
        frameCount: 1,
        capturedAt: new Date().toISOString(),
      };

      const verificationResult = await verifyBiometricWithArtifacts(
        intent,
        artifacts,
        captureMetadata,
      );
      if (
        verificationResult.result !== "PASSED" ||
        !verificationResult.verificationId
      ) {
        throw new Error(
          verificationResult.result === "FAILED"
            ? t("biometric.verificationFailed")
            : t("biometric.verificationCompleted", {
                result: verificationResult.result,
              }),
        );
      }

      completionGuardRef.current = true;
      setBiometricVerificationId(verificationResult.verificationId);
      finalizeAttendanceInBackground(
        verificationResult.verificationId,
        nextLocationCheck.snapshot,
      );
    } catch (nextError) {
      setCapturedArtifact(null);
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("biometric.submitFailed"),
      );
    } finally {
      setFaceProcessing(false);
    }
  }

  function finalizeAttendanceInBackground(
    verificationId: string,
    snapshot: AttendanceLocationSnapshot,
  ) {
    const currentStatus =
      status ?? initialTodaySnapshot?.value.attendanceStatus ?? null;
    const optimisticRecordedAt = new Date().toISOString();
    const optimisticStatus = buildOptimisticAttendanceStatus(currentStatus, {
      sessionId:
        currentStatus?.activeSession?.id ??
        `pending-${action}-${optimisticRecordedAt}`,
      recordedAt: optimisticRecordedAt,
    });

    if (optimisticStatus) {
      setStatus(optimisticStatus);
      void syncTodayScreenCache(optimisticStatus);
    }

    router.replace("/today" as never);

    void submitAttendanceAction(action, {
      ...snapshot,
      biometricVerificationId: verificationId,
      notes: isCheckIn
        ? "Mobile attendance check-in"
        : "Mobile attendance check-out",
    })
      .then((attendanceResult) => {
        const reconciledStatus = optimisticStatus
          ? buildOptimisticAttendanceStatus(optimisticStatus, attendanceResult as {
              sessionId: string;
              recordedAt: string;
            })
          : null;

        if (reconciledStatus) {
          void syncTodayScreenCache(reconciledStatus);
        }

        return warmTodayScreenCache(undefined, language);
      })
      .catch(() => warmTodayScreenCache(undefined, language))
      .finally(() => {
        completionGuardRef.current = false;
      });
  }

  function buildOptimisticAttendanceStatus(
    currentStatus: AttendanceStatusResponse | null,
    actionResult: {
      sessionId: string;
      recordedAt: string;
    },
  ): AttendanceStatusResponse | null {
    if (!currentStatus) {
      return null;
    }

    if (isCheckIn) {
      return {
        ...currentStatus,
        attendanceState: "checked_in",
        allowedActions: ["check_out", "start_break"],
        activeSession: {
          id: actionResult.sessionId,
          startedAt: actionResult.recordedAt,
          endedAt: null,
          breakMinutes: 0,
          paidBreakMinutes: 0,
          activeBreak: null,
        },
      };
    }

    return {
      ...currentStatus,
      attendanceState: "checked_out",
      allowedActions: [],
      activeSession: null,
    };
  }

  async function syncTodayScreenCache(nextAttendanceStatus: AttendanceStatusResponse) {
    const currentSnapshot =
      peekScreenCache<TodayScreenCacheValue>(
        TODAY_SCREEN_CACHE_KEY,
        TODAY_SCREEN_CACHE_TTL_MS,
      ) ??
      (await readScreenCache<TodayScreenCacheValue>(
        TODAY_SCREEN_CACHE_KEY,
        TODAY_SCREEN_CACHE_TTL_MS,
      ));

    await writeScreenCache(TODAY_SCREEN_CACHE_KEY, {
      attendanceStatus: nextAttendanceStatus,
      profile: currentSnapshot?.value.profile ?? null,
      shifts: currentSnapshot?.value.shifts ?? [],
      tasks: currentSnapshot?.value.tasks ?? [],
    } satisfies TodayScreenCacheValue);
  }

  async function handlePrimaryAction() {
    if (biometricVerificationId && locationCheck.state !== "ready") {
      await runLocationCheck();
      return;
    }

    if (!permission?.granted) {
      if (permission?.canAskAgain ?? true) {
        setCameraPromptOpen(true);
      } else {
        await ensurePermission();
      }
      return;
    }

    await captureAndVerifyFace();
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 12,
          paddingTop: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1">
          <View
            className="relative w-full items-center justify-center"
            style={{ minHeight: 48 }}
          >
            <PressableScale
              className="h-10 w-10 items-center justify-center"
              haptic="selection"
              onPress={() => router.back()}
              style={{
                left: 0,
                position: "absolute",
                top: 4,
                zIndex: 10,
              }}
            >
              <Ionicons
                color="#24314b"
                name="chevron-back"
                size={20}
                style={directionalIconStyle}
              />
            </PressableScale>
            <BrandWordmark className="text-[44px] leading-[48px] text-[#26334a]" />
          </View>

          <View
            className="mt-14 overflow-hidden rounded-[28px] bg-[#0f1724]"
            style={{ height: 420 }}
          >
            {permission?.granted ? (
              capturedArtifact ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: capturedArtifact }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : (
                <CameraView
                  facing="front"
                  mode="picture"
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                />
              )
            ) : (
              <View className="flex-1 items-center justify-center px-6">
                <Text
                  style={[
                    styles.bodyText,
                    { color: "#dbe5f6", textAlign: "center" },
                  ]}
                >
                  {copy.cameraPermission}
                </Text>
              </View>
            )}

            <View className="absolute inset-x-0 bottom-0 bg-[#0f1724]/60 px-5 py-4">
              <Text style={styles.cameraCaption}>
                {status?.shift?.label ?? ""}
              </Text>
              <Text style={styles.cameraShift}>{shiftTime}</Text>
              <Text style={styles.cameraBody}>{cameraStatusText}</Text>
            </View>
          </View>

          {locationCheck.state === "outside" &&
          status?.location &&
          mapRegion ? (
            <View className="mt-5 overflow-hidden rounded-[28px] border border-[#d9e1ef] bg-white">
              <View className="px-5 pb-4 pt-5">
                <Text style={styles.sectionTitle}>{copy.mapTitle}</Text>
                <Text style={styles.sectionBody}>
                  {copy.locationOutsideBody}
                </Text>
                {locationCheck.distanceMeters != null ? (
                  <Text style={[styles.sectionBody, { color: "#b93b4a" }]}>
                    {copy.outOfZoneDistance.replace(
                      "{distance}",
                      formatDistance(locationCheck.distanceMeters, language),
                    )}
                  </Text>
                ) : null}
              </View>
              <MapView
                initialRegion={mapRegion}
                scrollEnabled={false}
                style={{ height: 220, width: "100%" }}
              >
                <Circle
                  center={{
                    latitude: status.location.latitude,
                    longitude: status.location.longitude,
                  }}
                  fillColor="rgba(84,108,242,0.12)"
                  radius={status.location.radiusMeters}
                  strokeColor="rgba(84,108,242,0.55)"
                />
                <Marker
                  coordinate={{
                    latitude: status.location.latitude,
                    longitude: status.location.longitude,
                  }}
                  pinColor="#546cf2"
                  title={copy.targetLabel}
                />
                <Marker
                  coordinate={{
                    latitude: locationCheck.snapshot.latitude,
                    longitude: locationCheck.snapshot.longitude,
                  }}
                  pinColor="#ef4444"
                  title={copy.currentLabel}
                />
              </MapView>
            </View>
          ) : null}

          {message ? (
            <Text style={[styles.feedbackText, { color: "#546cf2" }]}>
              {message}
            </Text>
          ) : null}
          {error ? (
            <Text style={[styles.feedbackText, { color: "#b93b4a" }]}>
              {error}
            </Text>
          ) : null}

          <View className="mt-auto gap-3 pt-5">
            <PressableScale
              className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${
                primaryButtonDisabled ? "opacity-70" : ""
              }`}
              disabled={primaryButtonDisabled}
              haptic="medium"
              onPress={() => void handlePrimaryAction()}
            >
              <Text style={styles.primaryButtonLabel}>
                {primaryButtonLabel}
              </Text>
            </PressableScale>

            {(locationCheck.state === "outside" ||
              locationCheck.state === "error") &&
            !faceProcessing &&
            !submitting ? (
              <PressableScale
                className="min-h-[54px] items-center justify-center rounded-[18px] border border-[#d8deea] bg-white"
                haptic="selection"
                onPress={() => void runLocationCheck()}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {copy.retryLocation}
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {cameraPromptOpen ? (
        <View pointerEvents="box-none" style={styles.modalHost}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{copy.cameraPromptTitle}</Text>
            <Text style={styles.modalBody}>{copy.cameraPromptBody}</Text>
            <View style={styles.modalActions}>
              <PressableScale
                className="min-h-[50px] flex-1 items-center justify-center rounded-[18px] border border-[#d8deea] bg-white"
                haptic="selection"
                onPress={() => setCameraPromptOpen(false)}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {copy.cameraPromptCancel}
                </Text>
              </PressableScale>
              <PressableScale
                className="min-h-[50px] flex-1 items-center justify-center rounded-[18px] bg-[#546cf2]"
                haptic="medium"
                onPress={() => {
                  setCameraPromptOpen(false);
                  void ensurePermission();
                }}
              >
                <Text style={styles.modalPrimaryLabel}>
                  {copy.cameraPromptConfirm}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: "#7a8094",
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    letterSpacing: 1.2,
    includeFontPadding: false,
    textTransform: "uppercase",
  },
  title: {
    color: "#26334a",
    fontFamily: "Manrope_700Bold",
    fontSize: 34,
    lineHeight: 38,
    includeFontPadding: false,
    textAlign: "center",
  },
  bodyText: {
    color: "#6f7892",
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
  },
  cameraCaption: {
    color: "#e7ebf5",
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    letterSpacing: 1.2,
    includeFontPadding: false,
    textAlign: "center",
    textTransform: "uppercase",
  },
  cameraShift: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 30,
    lineHeight: 34,
    includeFontPadding: false,
    textAlign: "center",
  },
  cameraBody: {
    color: "#d9e1ef",
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: false,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#26334a",
    fontFamily: "Manrope_700Bold",
    fontSize: 20,
    lineHeight: 26,
    includeFontPadding: false,
  },
  sectionBody: {
    color: "#6f7892",
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: false,
    marginTop: 6,
  },
  feedbackText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
    marginTop: 14,
    textAlign: "center",
  },
  primaryButtonLabel: {
    color: "#f7f1e6",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
    includeFontPadding: false,
  },
  secondaryButtonLabel: {
    color: "#26334a",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
    includeFontPadding: false,
  },
  modalHost: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 36, 0.24)",
  },
  modalCard: {
    borderRadius: 28,
    backgroundColor: "#f8fbff",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: "#0f1724",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  modalTitle: {
    color: "#1f2b40",
    fontFamily: "Manrope_700Bold",
    fontSize: 22,
    lineHeight: 28,
    includeFontPadding: false,
  },
  modalBody: {
    color: "#66728f",
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: false,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalPrimaryLabel: {
    color: "#f7f1e6",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
  },
});
