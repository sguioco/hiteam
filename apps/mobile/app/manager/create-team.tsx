import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ManagerEmployeeItem } from "@smart/types";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../../components/ui/pressable-scale";
import { Screen } from "../../components/ui/screen";
import { Text } from "../../components/ui/text";
import { createManagerTeam, loadEmployeesBootstrap } from "../../lib/api";
import { resolveEmployeeAvatarSource } from "../../lib/employee-avatar";
import {
  getDirectionalIconStyle,
  getTextDirectionStyle,
  useI18n,
} from "../../lib/i18n";
import BottomSheetModal from "../../src/components/BottomSheetModal";
import {
  BOTTOM_SHEET_ACTION_BUTTON_CLASS,
  BOTTOM_SHEET_ACTION_TEXT_CLASS,
  getBottomSheetActionBottomOffset,
  getScreenActionBottomOffset,
  getScreenActionReservedSpace,
} from "../../src/components/bottom-sheet-actions";
import { EmployeeAvatarImage } from "../../src/components/employee-avatar-image";
import { ParticipantAvatarStrip } from "../../src/components/participant-avatar-strip";

function getEmployeeName(employee: ManagerEmployeeItem) {
  return `${employee.lastName} ${employee.firstName}`.trim();
}

function getEmployeeInitials(employee: ManagerEmployeeItem) {
  return `${employee.lastName.charAt(0)}${employee.firstName.charAt(0)}`.toUpperCase();
}

export default function CreateTeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const directionalIconStyle = useMemo(
    () => getDirectionalIconStyle(language),
    [language],
  );
  const textDirectionStyle = useMemo(
    () => getTextDirectionStyle(language),
    [language],
  );
  const actionBottomOffset = getScreenActionBottomOffset(insets.bottom);
  const actionReservedSpace = getScreenActionReservedSpace(insets.bottom);
  const sheetBottomOffset = getBottomSheetActionBottomOffset(insets.bottom);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [employees, setEmployees] = useState<ManagerEmployeeItem[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadEmployees() {
      try {
        const bootstrap = await loadEmployeesBootstrap();
        if (!active) {
          return;
        }

        setEmployees(
          [...bootstrap.employeeRecords].sort((left, right) =>
            getEmployeeName(left).localeCompare(getEmployeeName(right)),
          ),
        );
        setLoadError("");
      } catch {
        if (active) {
          setLoadError(t("manager.createTeamLoadError"));
        }
      } finally {
        if (active) {
          setLoadingEmployees(false);
        }
      }
    }

    void loadEmployees();

    return () => {
      active = false;
    };
  }, [t]);

  const selectedEmployees = useMemo(
    () =>
      selectedMemberIds
        .map((employeeId) =>
          employees.find((employee) => employee.id === employeeId),
        )
        .filter((employee): employee is ManagerEmployeeItem => Boolean(employee)),
    [employees, selectedMemberIds],
  );

  const filteredEmployees = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase();
    if (!query) {
      return employees;
    }

    return employees.filter((employee) => {
      const searchText = [
        getEmployeeName(employee),
        employee.email,
        employee.position?.name,
        employee.department?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchText.includes(query);
    });
  }, [employees, memberSearch]);

  function toggleMember(employeeId: string) {
    setSelectedMemberIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  async function handleCreateTeam() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t("manager.createTeamNameRequired"));
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      await createManagerTeam({
        name: trimmedName,
        description: description.trim() || undefined,
        memberEmployeeIds: selectedMemberIds,
      });

      Alert.alert(t("manager.createTeamCreated"), undefined, [
        {
          text: t("common.done"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : t("manager.createTeamError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Screen
        contentContainerStyle={{ paddingBottom: actionReservedSpace + 20 }}
        footer={
          <PressableScale
            className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} border border-transparent bg-[#566df6] shadow-lg shadow-[#566df6]/25 ${
              submitting ? "opacity-60" : ""
            }`}
            disabled={submitting}
            haptic="selection"
            onPress={() => void handleCreateTeam()}
          >
            <Text
              className={`${BOTTOM_SHEET_ACTION_TEXT_CLASS} text-[17px] text-white`}
            >
              {submitting
                ? t("manager.createTeamCreating")
                : t("manager.createTeamSubmit")}
            </Text>
          </PressableScale>
        }
        footerStyle={{ bottom: actionBottomOffset, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        withGradient
      >
        <StatusBar backgroundColor="transparent" style="dark" translucent />

        <View className="flex-row items-center gap-3">
          <PressableScale
            className="h-9 w-9 items-center justify-center rounded-full bg-white/70"
            haptic="selection"
            onPress={() => router.back()}
          >
            <Ionicons
              color="#1f2937"
              name="arrow-back"
              size={22}
              style={directionalIconStyle}
            />
          </PressableScale>
          <Text className="flex-1 font-display text-[24px] font-extrabold text-foreground">
            {t("manager.createTeamTitle")}
          </Text>
        </View>

        <View className="flex-row items-center gap-3 px-1">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-white/80">
            <Ionicons color="#566df6" name="people-outline" size={22} />
          </View>
          <Text className="flex-1 font-body text-[14px] leading-5 text-muted-foreground">
            {t("manager.createTeamIntro")}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="px-1 font-display text-[14px] font-bold text-foreground">
            {t("manager.createTeamName")}
          </Text>
          <TextInput
            autoCapitalize="sentences"
            className="min-h-[56px] w-full rounded-[22px] border-2 border-border bg-white text-[16px] text-foreground"
            onChangeText={(value) => {
              setName(value);
              if (formError) {
                setFormError("");
              }
            }}
            placeholder={t("manager.createTeamNamePlaceholder")}
            placeholderTextColor="#8c99ae"
            returnKeyType="next"
            style={[textDirectionStyle, { paddingHorizontal: 18 }]}
            value={name}
          />
        </View>

        <View className="gap-2">
          <Text className="px-1 font-display text-[14px] font-bold text-foreground">
            {t("manager.createTeamDescription")}
          </Text>
          <TextInput
            className="min-h-[116px] w-full rounded-[22px] border-2 border-border bg-white text-[16px] text-foreground"
            multiline
            onChangeText={setDescription}
            placeholder={t("manager.createTeamDescriptionPlaceholder")}
            placeholderTextColor="#8c99ae"
            style={[
              textDirectionStyle,
              {
                paddingHorizontal: 18,
                paddingTop: 16,
                textAlignVertical: "top",
              },
            ]}
            value={description}
          />
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3 px-1">
            <Text className="font-display text-[14px] font-bold text-foreground">
              {t("manager.createTeamMembers")}
            </Text>
            <Text className="font-body text-[12px] text-muted-foreground">
              {t("manager.createTeamMembersOptional")}
            </Text>
          </View>

          <PressableScale
            className="min-h-[76px] rounded-[22px] border-2 border-border bg-white px-4 py-4"
            haptic="selection"
            onPress={() => setMemberPickerOpen(true)}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                <Ionicons color="#566df6" name="person-add-outline" size={20} />
              </View>
              <View className="flex-1">
                <Text className="font-display text-[15px] font-semibold text-foreground">
                  {selectedMemberIds.length > 0
                    ? t("manager.createTeamSelectedMembers", {
                        count: selectedMemberIds.length,
                      })
                    : t("manager.createTeamSelectMembers")}
                </Text>
                {loadingEmployees ? (
                  <Text className="mt-1 font-body text-[12px] text-muted-foreground">
                    {t("common.loading")}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                color="#75839a"
                name="chevron-forward"
                size={19}
                style={directionalIconStyle}
              />
            </View>

            <ParticipantAvatarStrip participants={selectedEmployees} />
          </PressableScale>
        </View>

        {loadError ? (
          <View className="flex-row items-start gap-2 rounded-2xl bg-[#fff4f4] px-4 py-3">
            <Ionicons color="#dc4655" name="alert-circle-outline" size={18} />
            <Text className="flex-1 font-body text-[13px] leading-5 text-[#c33c4a]">
              {loadError}
            </Text>
          </View>
        ) : null}

        {formError ? (
          <View className="flex-row items-start gap-2 px-1">
            <Ionicons color="#dc4655" name="alert-circle-outline" size={18} />
            <Text className="flex-1 font-body text-[13px] leading-5 text-[#c33c4a]">
              {formError}
            </Text>
          </View>
        ) : null}
      </Screen>

      <BottomSheetModal
        onClose={() => {
          setMemberPickerOpen(false);
          setMemberSearch("");
        }}
        sheetClassName="rounded-t-[30px]"
        sheetStyle={{ height: "86%" }}
        solidBackground
        visible={memberPickerOpen}
      >
        <View
          className="h-full px-5 pt-8"
          style={{ paddingBottom: sheetBottomOffset }}
        >
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="font-display text-[22px] font-extrabold text-foreground">
                {t("manager.createTeamMemberPickerTitle")}
              </Text>
              <Text className="mt-1 font-body text-[13px] leading-5 text-muted-foreground">
                {t("manager.createTeamMemberPickerHint")}
              </Text>
            </View>
            {selectedMemberIds.length > 0 ? (
              <PressableScale
                className="min-h-9 justify-center px-2"
                haptic="selection"
                onPress={() => setSelectedMemberIds([])}
              >
                <Text className="font-display text-[13px] font-semibold text-[#566df6]">
                  {t("manager.createTeamClearMembers")}
                </Text>
              </PressableScale>
            ) : null}
          </View>

          <View className="mt-4 min-h-[50px] flex-row items-center gap-3 rounded-[18px] border border-[#d8e2f0] bg-[#f7f9fd] px-4">
            <Ionicons color="#7f8da4" name="search-outline" size={19} />
            <TextInput
              className="flex-1 py-3 text-[15px] text-foreground"
              onChangeText={setMemberSearch}
              placeholder={t("manager.createTeamMemberSearch")}
              placeholderTextColor="#8c99ae"
              style={textDirectionStyle}
              value={memberSearch}
            />
            {memberSearch ? (
              <PressableScale
                className="h-8 w-8 items-center justify-center rounded-full bg-white"
                haptic="selection"
                onPress={() => setMemberSearch("")}
              >
                <Ionicons color="#64748b" name="close" size={16} />
              </PressableScale>
            ) : null}
          </View>

          <ScrollView
            className="mt-3 flex-1"
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredEmployees.map((employee, index) => {
              const selected = selectedMemberIds.includes(employee.id);
              const avatarSource = resolveEmployeeAvatarSource(employee);

              return (
                <View key={employee.id}>
                  <PressableScale
                    className="min-h-[68px] justify-center py-3"
                    haptic="selection"
                    onPress={() => toggleMember(employee.id)}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#eef2ff]">
                        {avatarSource ? (
                          <EmployeeAvatarImage
                            className="h-11 w-11 rounded-full"
                            source={avatarSource}
                          />
                        ) : (
                          <Text className="font-display text-[13px] font-bold text-[#566df6]">
                            {getEmployeeInitials(employee)}
                          </Text>
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className="font-display text-[15px] font-semibold text-foreground">
                          {getEmployeeName(employee)}
                        </Text>
                        <Text
                          className="mt-1 font-body text-[12px] text-muted-foreground"
                          numberOfLines={1}
                        >
                          {employee.position?.name || employee.email}
                        </Text>
                      </View>

                      <View
                        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                          selected
                            ? "border-[#566df6] bg-[#566df6]"
                            : "border-[#cfd8e8] bg-white"
                        }`}
                      >
                        {selected ? (
                          <Ionicons color="#ffffff" name="checkmark" size={15} />
                        ) : null}
                      </View>
                    </View>
                  </PressableScale>

                  {index < filteredEmployees.length - 1 ? (
                    <View className="ml-14 h-px bg-[#e7ecf4]" />
                  ) : null}
                </View>
              );
            })}

            {!loadingEmployees && filteredEmployees.length === 0 ? (
              <View className="items-center px-6 py-12">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#eef2ff]">
                  <Ionicons color="#7585eb" name="people-outline" size={23} />
                </View>
                <Text className="mt-3 text-center font-body text-[14px] text-muted-foreground">
                  {t("manager.createTeamNoEmployees")}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <PressableScale
            className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} mt-3 border border-transparent bg-[#566df6]`}
            haptic="selection"
            onPress={() => {
              setMemberPickerOpen(false);
              setMemberSearch("");
            }}
          >
            <Text
              className={`${BOTTOM_SHEET_ACTION_TEXT_CLASS} text-[16px] text-white`}
            >
              {t("common.done")}
            </Text>
          </PressableScale>
        </View>
      </BottomSheetModal>
    </>
  );
}
