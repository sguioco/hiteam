import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../../components/ui/pressable-scale";
import { Text } from "../../components/ui/text";
import {
  createMobileCompany,
  createMobileLocation,
  loadMobileCompanies,
  loadMobileLocations,
  loadManagerEmployees,
  transferMobileEmployeeLocation,
  type MobileCompany,
  type MobileWorkLocation,
} from "../../lib/api";
import type { ManagerEmployeeItem } from "@smart/types";
import { useAuthFlowState } from "../../lib/auth-flow";
import { hapticSuccess } from "../../lib/haptics";
import { useI18n } from "../../lib/i18n";
import { capturePreciseAttendanceLocation } from "../../lib/location";
import {
  getWorkspaceScope,
  hydrateWorkspaceScope,
  setWorkspaceScope,
  useWorkspaceScope,
} from "../../lib/workspace-scope";

type ComposerMode = "company" | "location" | "employees" | null;

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const { roleCodes } = useAuthFlowState();
  const copy = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Локации",
            subtitle: "Организации, рабочие адреса и сотрудники",
            organization: "Организация",
            addOrganization: "Добавить организацию",
            addLocation: "Добавить адрес",
            noLocations: "У этой организации пока нет рабочих адресов.",
            companyName: "Название организации",
            locationName: "Название точки",
            address: "Адрес",
            currentPoint: "Использовать мою геопозицию",
            save: "Сохранить",
            cancel: "Отмена",
            employees: "сотрудников",
            selectEmployees: "Сотрудники на этом адресе",
            moveEmployees: "Перенести сотрудников",
            activeLocation: "Активная точка",
            chooseLocation: "Выбрать эту точку",
            captureError:
              "Не удалось получить точную геопозицию. Проверьте разрешения.",
            loadError: "Не удалось загрузить локации.",
          }
        : {
            title: "Locations",
            subtitle: "Organizations, work addresses, and employees",
            organization: "Organization",
            addOrganization: "Add organization",
            addLocation: "Add address",
            noLocations: "This organization has no work addresses yet.",
            companyName: "Organization name",
            locationName: "Location name",
            address: "Address",
            currentPoint: "Use my current location",
            save: "Save",
            cancel: "Cancel",
            employees: "employees",
            selectEmployees: "Employees at this address",
            moveEmployees: "Move employees",
            activeLocation: "Active location",
            chooseLocation: "Use this location",
            captureError:
              "Unable to capture a precise location. Check permissions.",
            loadError: "Unable to load locations.",
          },
    [language],
  );
  const canManage = roleCodes.some((role) =>
    ["tenant_owner", "operations_admin", "manager"].includes(role),
  );
  const [companies, setCompanies] = useState<MobileCompany[]>([]);
  const [locations, setLocations] = useState<MobileWorkLocation[]>([]);
  const [employees, setEmployees] = useState<ManagerEmployeeItem[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [companyName, setCompanyName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [targetLocationId, setTargetLocationId] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const workspaceScope = useWorkspaceScope();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextCompanies, nextLocations, nextEmployees] = await Promise.all([
        loadMobileCompanies(),
        loadMobileLocations(),
        canManage ? loadManagerEmployees() : Promise.resolve([]),
        hydrateWorkspaceScope(),
      ]);
      setCompanies(nextCompanies);
      setLocations(nextLocations);
      setEmployees(nextEmployees);
      setSelectedCompanyId((current) =>
        nextCompanies.some(({ id }) => id === current)
          ? current
          : nextCompanies[0]?.id ?? "",
      );
      const savedScope = getWorkspaceScope();
      const activeLocation = nextLocations.find(
        ({ id, companyId }) =>
          id === savedScope?.locationId &&
          companyId === savedScope.companyId,
      );
      const fallbackLocation = activeLocation ?? nextLocations[0];
      if (
        fallbackLocation &&
        (fallbackLocation.id !== savedScope?.locationId ||
          fallbackLocation.companyId !== savedScope?.companyId)
      ) {
        await setWorkspaceScope({
          companyId: fallbackLocation.companyId,
          locationId: fallbackLocation.id,
        });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function closeComposer(force = false) {
    if (saving && !force) return;
    setComposerMode(null);
    setCompanyName("");
    setLocationName("");
    setTargetLocationId("");
    setAddress("");
    setCoordinates(null);
    setSelectedEmployeeIds([]);
    setError(null);
  }

  async function capturePoint() {
    setCapturing(true);
    setError(null);
    try {
      const point = await capturePreciseAttendanceLocation(100);
      setCoordinates({
        latitude: point.latitude,
        longitude: point.longitude,
      });
      hapticSuccess();
    } catch {
      setError(copy.captureError);
    } finally {
      setCapturing(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (composerMode === "company") {
        const created = await createMobileCompany({
          name: companyName.trim(),
        });
        setCompanies((current) => [created, ...current]);
        setSelectedCompanyId(created.id);
        closeComposer(true);
        hapticSuccess();
        return;
      }

      if (
        composerMode === "location" &&
        selectedCompanyId &&
        coordinates
      ) {
        const created = await createMobileLocation({
          companyId: selectedCompanyId,
          name: locationName.trim(),
          code: `LOC-${Date.now().toString(36).toUpperCase()}`,
          address: address.trim(),
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          geofenceRadiusMeters: 100,
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          employeeIds: selectedEmployeeIds,
        });
        setLocations((current) => [created, ...current]);
        await setWorkspaceScope({
          companyId: created.companyId,
          locationId: created.id,
        });
        closeComposer(true);
        hapticSuccess();
        return;
      }

      if (composerMode === "employees" && targetLocationId) {
        await Promise.all(
          selectedEmployeeIds.map((employeeId) =>
            transferMobileEmployeeLocation(employeeId, {
              locationId: targetLocationId,
              reason:
                language === "ru"
                  ? "Перенос через управление локациями"
                  : "Moved from location management",
            }),
          ),
        );
        await load();
        closeComposer(true);
        hapticSuccess();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setSaving(false);
    }
  }

  const visibleLocations = locations.filter(
    ({ companyId }) => companyId === selectedCompanyId,
  );

  return (
    <View className="flex-1 bg-[#f4f7fb]">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 20) + 24,
          paddingHorizontal: 16,
          paddingTop: insets.top + 14,
        }}
      >
        <View className="mb-6 flex-row items-start gap-3">
          <PressableScale
            className="h-11 w-11 items-center justify-center rounded-full border border-white bg-white/85"
            haptic="selection"
            onPress={() => router.back()}
          >
            <Ionicons color="#1f2937" name="arrow-back" size={20} />
          </PressableScale>
          <View className="flex-1">
            <Text className="font-display text-[30px] font-bold text-foreground">
              {copy.title}
            </Text>
            <Text className="mt-1 font-body text-[14px] text-muted-foreground">
              {copy.subtitle}
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#315cf6" />
          </View>
        ) : (
          <>
            <ScrollView
              className="-mx-4"
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {companies.map((company) => {
                const selected = company.id === selectedCompanyId;
                return (
                  <PressableScale
                    className={`h-11 justify-center rounded-2xl border px-4 ${
                      selected
                        ? "border-[#315cf6] bg-[#315cf6]"
                        : "border-[#dfe7f2] bg-white"
                    }`}
                    haptic="selection"
                    key={company.id}
                    onPress={() => setSelectedCompanyId(company.id)}
                  >
                    <Text
                      className={`font-body text-[14px] font-bold ${
                        selected ? "text-white" : "text-foreground"
                      }`}
                    >
                      {company.name}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>

            {canManage ? (
              <View className="my-5 flex-row gap-2">
                <PressableScale
                  className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#dfe7f2] bg-white"
                  haptic="selection"
                  onPress={() => setComposerMode("company")}
                >
                  <Ionicons color="#315cf6" name="add" size={18} />
                  <Text className="font-body text-[13px] font-bold text-[#315cf6]">
                    {copy.addOrganization}
                  </Text>
                </PressableScale>
                <PressableScale
                  className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#315cf6]"
                  haptic="selection"
                  onPress={() => setComposerMode("location")}
                >
                  <Ionicons color="#ffffff" name="location-outline" size={17} />
                  <Text className="font-body text-[13px] font-bold text-white">
                    {copy.addLocation}
                  </Text>
                </PressableScale>
              </View>
            ) : null}

            <View className="overflow-hidden rounded-[28px] border border-[#e2e9f3] bg-white">
              {visibleLocations.length ? (
                visibleLocations.map((location, index) => {
                  const active = workspaceScope?.locationId === location.id;
                  return (
                  <PressableScale
                    className={`flex-row items-center gap-3 px-4 py-4 ${
                      index < visibleLocations.length - 1
                        ? "border-b border-[#e8edf5]"
                        : ""
                    } ${active ? "bg-[#f3f6ff]" : "bg-white"}`}
                    haptic="selection"
                    key={location.id}
                    onPress={() =>
                      void setWorkspaceScope({
                        companyId: location.companyId,
                        locationId: location.id,
                      })
                    }
                  >
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-2xl ${
                        active ? "bg-[#315cf6]" : "bg-[#edf2ff]"
                      }`}
                    >
                      <Ionicons
                        color={active ? "#ffffff" : "#315cf6"}
                        name={active ? "checkmark" : "location-outline"}
                        size={20}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-body text-[15px] font-bold text-foreground">
                        {location.name}
                      </Text>
                      <Text className="mt-1 font-body text-[13px] leading-5 text-muted-foreground">
                        {location.address}
                      </Text>
                      <Text className="mt-1 font-body text-[12px] text-[#315cf6]">
                        {active
                          ? copy.activeLocation
                          : `${location._count?.employeeAssignments ?? 0} ${copy.employees}`}
                      </Text>
                    </View>
                    {canManage ? (
                      <PressableScale
                        accessibilityLabel={copy.moveEmployees}
                        className="h-10 w-10 items-center justify-center rounded-full bg-[#edf2ff]"
                        haptic="selection"
                        onPress={() => {
                          setTargetLocationId(location.id);
                          setSelectedEmployeeIds([]);
                          setComposerMode("employees");
                        }}
                      >
                        <Ionicons
                          color="#315cf6"
                          name="people-outline"
                          size={18}
                        />
                      </PressableScale>
                    ) : !active ? (
                      <Ionicons
                        color="#8a96a8"
                        name="chevron-forward"
                        size={18}
                      />
                    ) : null}
                  </PressableScale>
                  );
                })
              ) : (
                <Text className="px-5 py-10 text-center font-body text-[14px] text-muted-foreground">
                  {copy.noLocations}
                </Text>
              )}
            </View>
          </>
        )}
        {error ? (
          <Text className="mt-4 rounded-2xl bg-red-50 px-4 py-3 font-body text-[13px] text-red-600">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => closeComposer()}
        transparent
        visible={composerMode !== null}
      >
        <View className="flex-1 justify-end bg-[#101418]/35">
          <View
            className="rounded-t-[32px] bg-white px-5 pt-6"
            style={{ paddingBottom: Math.max(insets.bottom, 18) }}
          >
            <Text className="font-display text-[24px] font-bold text-foreground">
              {composerMode === "company"
                ? copy.addOrganization
                : composerMode === "location"
                  ? copy.addLocation
                  : copy.moveEmployees}
            </Text>
            <View className="mt-5 gap-3">
              {composerMode !== "employees" ? (
                <TextInput
                  className="h-13 rounded-2xl border border-[#dfe7f2] bg-[#f8faff] px-4 font-body text-[15px] text-foreground"
                  onChangeText={
                    composerMode === "company"
                      ? setCompanyName
                      : setLocationName
                  }
                  placeholder={
                    composerMode === "company"
                      ? copy.companyName
                      : copy.locationName
                  }
                  value={
                    composerMode === "company" ? companyName : locationName
                  }
                />
              ) : null}
              {composerMode === "location" ? (
                <>
                  <TextInput
                    className="h-13 rounded-2xl border border-[#dfe7f2] bg-[#f8faff] px-4 font-body text-[15px] text-foreground"
                    onChangeText={setAddress}
                    placeholder={copy.address}
                    value={address}
                  />
                  <PressableScale
                    className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl border ${
                      coordinates
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-[#dfe7f2] bg-white"
                    }`}
                    disabled={capturing}
                    haptic="selection"
                    onPress={() => void capturePoint()}
                  >
                    {capturing ? (
                      <ActivityIndicator color="#315cf6" />
                    ) : (
                      <Ionicons
                        color={coordinates ? "#16803d" : "#315cf6"}
                        name={coordinates ? "checkmark-circle" : "locate"}
                        size={19}
                      />
                    )}
                    <Text className="font-body text-[14px] font-bold text-[#315cf6]">
                      {copy.currentPoint}
                    </Text>
                  </PressableScale>
                  {employees.length ? (
                    <View className="gap-2">
                      <Text className="font-body text-[12px] font-bold text-muted-foreground">
                        {copy.selectEmployees} · {selectedEmployeeIds.length}
                      </Text>
                      <ScrollView
                        className="max-h-52 rounded-2xl border border-[#dfe7f2]"
                        nestedScrollEnabled
                      >
                        {employees.map((employee, index) => {
                          const selected = selectedEmployeeIds.includes(
                            employee.id,
                          );
                          return (
                            <PressableScale
                              className={`flex-row items-center gap-3 px-3 py-3 ${
                                index < employees.length - 1
                                  ? "border-b border-[#e7ecf5]"
                                  : ""
                              }`}
                              haptic="selection"
                              key={employee.id}
                              onPress={() =>
                                setSelectedEmployeeIds((current) =>
                                  selected
                                    ? current.filter(
                                        (id) => id !== employee.id,
                                      )
                                    : [...current, employee.id],
                                )
                              }
                            >
                              <View
                                className={`h-6 w-6 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-[#315cf6] bg-[#315cf6]"
                                    : "border-[#d7deeb] bg-white"
                                }`}
                              >
                                {selected ? (
                                  <Ionicons
                                    color="#ffffff"
                                    name="checkmark"
                                    size={14}
                                  />
                                ) : null}
                              </View>
                              <Text className="flex-1 font-body text-[14px] font-semibold text-foreground">
                                {`${employee.lastName} ${employee.firstName}`.trim()}
                              </Text>
                            </PressableScale>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </>
              ) : null}
              {composerMode === "employees" && employees.length ? (
                <View className="gap-2">
                  <Text className="font-body text-[12px] font-bold text-muted-foreground">
                    {copy.moveEmployees} · {selectedEmployeeIds.length}
                  </Text>
                  <ScrollView
                    className="max-h-72 rounded-2xl border border-[#dfe7f2]"
                    nestedScrollEnabled
                  >
                    {employees
                      .filter(
                        (employee) =>
                          employee.primaryLocation?.id !== targetLocationId,
                      )
                      .map((employee, index, availableEmployees) => {
                        const selected = selectedEmployeeIds.includes(
                          employee.id,
                        );
                        return (
                          <PressableScale
                            className={`flex-row items-center gap-3 px-3 py-3 ${
                              index < availableEmployees.length - 1
                                ? "border-b border-[#e7ecf5]"
                                : ""
                            }`}
                            haptic="selection"
                            key={employee.id}
                            onPress={() =>
                              setSelectedEmployeeIds((current) =>
                                selected
                                  ? current.filter((id) => id !== employee.id)
                                  : [...current, employee.id],
                              )
                            }
                          >
                            <View
                              className={`h-6 w-6 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-[#315cf6] bg-[#315cf6]"
                                  : "border-[#d7deeb] bg-white"
                              }`}
                            >
                              {selected ? (
                                <Ionicons
                                  color="#ffffff"
                                  name="checkmark"
                                  size={14}
                                />
                              ) : null}
                            </View>
                            <View className="flex-1">
                              <Text className="font-body text-[14px] font-semibold text-foreground">
                                {`${employee.lastName} ${employee.firstName}`.trim()}
                              </Text>
                              <Text className="mt-0.5 font-body text-[12px] text-muted-foreground">
                                {employee.primaryLocation?.name ?? "—"}
                              </Text>
                            </View>
                          </PressableScale>
                        );
                      })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
            <View className="mt-6 flex-row gap-3">
              <PressableScale
                className="h-12 flex-1 items-center justify-center rounded-2xl border border-[#dfe7f2]"
                onPress={() => closeComposer()}
              >
                <Text className="font-body text-[14px] font-bold text-foreground">
                  {copy.cancel}
                </Text>
              </PressableScale>
              <PressableScale
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#315cf6]"
                disabled={
                  saving ||
                  (composerMode === "company"
                    ? !companyName.trim()
                    : composerMode === "location"
                      ? !locationName.trim() || !address.trim() || !coordinates
                      : selectedEmployeeIds.length === 0)
                }
                haptic="selection"
                onPress={() => void submit()}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="font-body text-[14px] font-bold text-white">
                    {copy.save}
                  </Text>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
