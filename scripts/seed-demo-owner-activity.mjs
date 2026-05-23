const API_BASE = (process.env.DEMO_API_BASE || "https://api.85.237.211.182.nip.io").replace(/\/$/, "");
const API_PREFIX = `${API_BASE}/api/v1`;
const DEMO_TENANT = "demo";
const OWNER_EMAIL = "owner@demo.smart";
const OWNER_PASSWORD = "Admin12345!";
const EMPLOYEE_PASSWORD = "Employee123!";

const EMPLOYEE_LOGINS = new Map([
  [OWNER_EMAIL, { password: OWNER_PASSWORD, fingerprint: "demo-device-owner" }],
  ["employee@demo.smart", { password: EMPLOYEE_PASSWORD, fingerprint: "demo-device-alex" }],
  ["julia@demo.smart", { password: EMPLOYEE_PASSWORD, fingerprint: "demo-device-julia" }],
  ["sergey@demo.smart", { password: EMPLOYEE_PASSWORD, fingerprint: "demo-device-sergey" }],
  ["maria@demo.smart", { password: EMPLOYEE_PASSWORD, fingerprint: "demo-device-maria" }],
  ["manager@demo.smart", { password: EMPLOYEE_PASSWORD, fingerprint: "demo-device-manager" }],
]);

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function fullName(employee) {
  return `${employee.firstName} ${employee.lastName}`;
}

function emailOf(employee) {
  return employee.user?.email?.toLowerCase() ?? "";
}

function asTaskList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tasks)) return payload.tasks;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function request(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.message ??
      payload?.error ??
      text.slice(0, 500) ??
      response.statusText;
    throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${message}`);
  }

  return { payload, response };
}

async function login(email, password) {
  const { payload, response } = await request("/auth/login", {
    method: "POST",
    body: {
      tenantSlug: DEMO_TENANT,
      email,
      password,
    },
  });

  return {
    accessToken: payload.accessToken,
    serverDate: response.headers.get("date"),
  };
}

async function loadDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot download biometric reference: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function employeeFaceDataUrl(ownerToken, employeeId) {
  const { payload } = await request(`/biometric/employees/${employeeId}/history?limit=1`, {
    token: ownerToken,
  });

  return payload?.profile?.templateUrl ? loadDataUrl(payload.profile.templateUrl) : null;
}

async function ensureBiometric(token, faceDataUrl) {
  const { payload: policy } = await request("/biometric/policy", { token });

  if (policy.enrollmentStatus === "ENROLLED") {
    return;
  }

  await request("/biometric/enroll/start", {
    method: "POST",
    token,
    body: { consentVersion: "demo-seed-v1" },
  });
  await request("/biometric/enroll/complete", {
    method: "POST",
    token,
    body: {
      artifacts: [faceDataUrl],
      livenessScore: 0.96,
      captureMetadata: {
        demoSeed: true,
        frameCount: 3,
        challengeSteps: ["center", "left", "smile"],
      },
    },
  });
}

async function createVerification(token, faceDataUrl, intent) {
  const { payload } = await request("/biometric/verify", {
    method: "POST",
    token,
    body: {
      artifacts: [faceDataUrl],
      intent,
      captureMetadata: {
        demoSeed: true,
        frameCount: 3,
        challengeSteps: ["center", "right", "blink"],
      },
    },
  });

  return payload.verificationId;
}

async function listMyDevices(token) {
  const { payload } = await request("/devices/me", { token });
  return Array.isArray(payload) ? payload : [];
}

async function resolveDeviceFingerprint(token, loginConfig, employeeName) {
  const devices = await listMyDevices(token).catch(() => []);
  const primaryDevice =
    devices.find((device) => device.isPrimary && device.platform !== "WEB") ??
    devices.find((device) => device.isPrimary);

  if (primaryDevice?.deviceFingerprint) {
    return primaryDevice.deviceFingerprint;
  }

  const { payload } = await request("/devices/register", {
    method: "POST",
    token,
    body: {
      platform: "ANDROID",
      deviceFingerprint: loginConfig.fingerprint,
      deviceName: `${employeeName} demo phone`,
    },
  });

  if (payload?.isPrimary && payload.deviceFingerprint) {
    return payload.deviceFingerprint;
  }

  const updatedDevices = await listMyDevices(token).catch(() => []);
  const updatedPrimary =
    updatedDevices.find((device) => device.isPrimary && device.platform !== "WEB") ??
    updatedDevices.find((device) => device.isPrimary);

  if (updatedPrimary?.deviceFingerprint) {
    return updatedPrimary.deviceFingerprint;
  }

  throw new Error(`No primary device available for ${employeeName}.`);
}

async function setWorkMode(token, employeeId, workMode) {
  await request(`/employees/${employeeId}/work-mode`, {
    method: "PATCH",
    token,
    body: { workMode },
  });
}

async function correctSession(token, sessionId, body) {
  if (!sessionId) return null;

  const { payload } = await request(`/attendance/sessions/${sessionId}/correct`, {
    method: "POST",
    token,
    body,
  });

  return payload;
}

async function listLocations(token) {
  const { payload } = await request("/org/locations", { token });
  return Array.isArray(payload) ? payload : [];
}

async function todaySession(token, today) {
  const { payload } = await request(
    `/attendance/me/history?dateFrom=${encodeURIComponent(today)}&dateTo=${encodeURIComponent(today)}`,
    { token },
  );
  return Array.isArray(payload?.rows) ? payload.rows[0] ?? null : null;
}

async function checkInEmployee({ employee, loginConfig, faceDataUrl, location, notes, today }) {
  const auth = await login(emailOf(employee), loginConfig.password);
  const token = auth.accessToken;

  const deviceFingerprint = await resolveDeviceFingerprint(token, loginConfig, fullName(employee));
  await ensureBiometric(token, faceDataUrl);

  const existingSession = await todaySession(token, today).catch(() => null);
  if (existingSession) {
    return {
      skipped: true,
      state: existingSession.endedAt ? "checked_out" : "checked_in",
      sessionId: existingSession.sessionId,
      token,
      location,
      deviceFingerprint,
    };
  }

  const biometricVerificationId = await createVerification(
    token,
    faceDataUrl,
    "attendance_check_in",
  );

  let payload;
  try {
    ({ payload } = await request("/attendance/check-in", {
      method: "POST",
      token,
      body: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: 5,
        deviceFingerprint,
        biometricVerificationId,
        notes,
      },
    }));
  } catch (error) {
    const latestSession = await todaySession(token, today).catch(() => null);
    if (latestSession && String(error?.message ?? "").includes("already has an open attendance session")) {
      return {
        skipped: true,
        state: "checked_in",
        sessionId: latestSession.sessionId,
        token,
        location,
        deviceFingerprint,
      };
    }

    throw error;
  }

  return {
    skipped: false,
    payload,
    sessionId: payload.sessionId,
    token,
    location,
    deviceFingerprint,
  };
}

async function checkOutEmployee({ token, deviceFingerprint, location, faceDataUrl, notes }) {
  const biometricVerificationId = await createVerification(
    token,
    faceDataUrl,
    "attendance_check_out",
  );

  const { payload } = await request("/attendance/check-out", {
    method: "POST",
    token,
    body: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: 5,
      deviceFingerprint,
      biometricVerificationId,
      notes,
    },
  });

  return payload;
}

async function findExistingTask(token, title) {
  const { payload } = await request(`/collaboration/tasks?search=${encodeURIComponent(title)}`, {
    token,
  });

  return asTaskList(payload).find((task) => task.title === title) ?? null;
}

async function createTask(token, input) {
  const existing = await findExistingTask(token, input.title).catch(() => null);
  if (existing) return { task: existing, created: false };

  const { payload } = await request("/collaboration/tasks", {
    method: "POST",
    token,
    body: input,
  });

  return {
    task: Array.isArray(payload) ? payload[0] : payload,
    created: true,
  };
}

async function addPhotoProof(token, taskId, dataUrl) {
  await request(`/collaboration/tasks/${taskId}/photo-proofs`, {
    method: "POST",
    token,
    body: {
      action: "add",
      fileName: "demo-proof.jpg",
      dataUrl,
    },
  });
}

async function setTaskStatus(token, taskId, status, comment) {
  await request(`/collaboration/tasks/${taskId}/status`, {
    method: "POST",
    token,
    body: { status, comment },
  });
}

async function seedTasks(ownerToken, employeesByEmail, ownerFaceDataUrl, serverNow) {
  const due = (minutes) => addMinutes(serverNow, minutes).toISOString();
  const plan = [
    {
      email: OWNER_EMAIL,
      title: "Demo owner: разобрать опоздания за смену",
      description: "Проверить сотрудников с поздним входом и оставить короткий комментарий по каждому случаю.",
      priority: "HIGH",
      dueAt: due(90),
      status: "IN_PROGRESS",
      checklist: ["Проверить live attendance", "Отметить повторные опоздания"],
    },
    {
      email: OWNER_EMAIL,
      title: "Demo owner: утвердить закупку расходников",
      description: "Согласовать полотенца, перчатки и чистящие средства до вечерней смены.",
      priority: "URGENT",
      dueAt: due(160),
      status: "TODO",
      checklist: ["Сверить остатки", "Подтвердить бюджет"],
    },
    {
      email: OWNER_EMAIL,
      title: "Demo owner: принять фотоотчет склада",
      description: "Проверить порядок на складе и приложить подтверждающее фото после обхода.",
      priority: "MEDIUM",
      dueAt: due(240),
      status: "DONE",
      requiresPhoto: true,
    },
    {
      email: "employee@demo.smart",
      title: "Demo staff: подготовить ресепшен к вечернему потоку",
      description: "Протереть стойку, обновить воду для гостей и проверить рекламные материалы.",
      priority: "HIGH",
      dueAt: due(120),
      status: "TODO",
      checklist: ["Стойка чистая", "Вода и стаканы на месте", "Промо-материалы выставлены"],
    },
    {
      email: "employee@demo.smart",
      title: "Demo staff: фото витрины после выкладки",
      description: "Сделать фото розничной полки после перестановки товаров.",
      priority: "MEDIUM",
      dueAt: due(210),
      status: "TODO",
      requiresPhoto: true,
    },
    {
      email: "julia@demo.smart",
      title: "Demo staff: сверить VIP-записи на завтра",
      description: "Проверить список клиентов и подтвердить спорные окна у администратора.",
      priority: "HIGH",
      dueAt: due(150),
      status: "IN_PROGRESS",
    },
    {
      email: "julia@demo.smart",
      title: "Demo staff: закрыть чек-лист открытия кассы",
      description: "Проверить терминал, наличные и журнал смены.",
      priority: "MEDIUM",
      dueAt: due(190),
      status: "DONE",
      checklist: ["Терминал работает", "Журнал заполнен"],
    },
    {
      email: "sergey@demo.smart",
      title: "Demo staff: пополнить санитайзеры в кабинетах",
      description: "Проверить все рабочие зоны и заменить пустые флаконы.",
      priority: "LOW",
      dueAt: due(180),
      status: "DONE",
    },
    {
      email: "sergey@demo.smart",
      title: "Demo staff: разобраться с расхождением инвентаря",
      description: "Сверить фактические остатки с журналом и отправить owner итог.",
      priority: "URGENT",
      dueAt: due(260),
      status: "TODO",
    },
    {
      email: "maria@demo.smart",
      title: "Demo staff: восстановить пропущенный чек-лист открытия",
      description: "Сотрудник не отметился на смене, задача оставлена как follow-up для руководителя.",
      priority: "HIGH",
      dueAt: due(110),
      status: "TODO",
    },
  ];

  const created = [];
  const skipped = [];

  for (const item of plan) {
    const employee = employeesByEmail.get(item.email);
    if (!employee) {
      skipped.push(`${item.title}: employee not found`);
      continue;
    }

    const { task, created: wasCreated } = await createTask(ownerToken, {
      assigneeEmployeeId: employee.id,
      title: item.title,
      description: item.description,
      priority: item.priority,
      requiresPhoto: Boolean(item.requiresPhoto),
      dueAt: item.dueAt,
      checklist: item.checklist ?? [],
    });

    if (!wasCreated) {
      skipped.push(`${item.title}: already exists`);
      continue;
    }

    if (item.requiresPhoto && item.status === "DONE") {
      await addPhotoProof(ownerToken, task.id, ownerFaceDataUrl);
    }

    if (item.status && item.status !== "TODO") {
      await setTaskStatus(
        ownerToken,
        task.id,
        item.status,
        `Demo seed: ${item.status.toLowerCase().replace("_", " ")} status.`,
      );
    }

    created.push(`${item.title} -> ${fullName(employee)} (${item.status})`);
  }

  return { created, skipped };
}

async function seedAttendance(ownerToken, employeesByEmail, locationsById, baseFaceDataUrl, today) {
  const attendancePlan = [
    {
      email: "employee@demo.smart",
      action: "check_in",
      label: "пришел вовремя",
    },
    {
      email: "julia@demo.smart",
      action: "check_in",
      label: "опоздала",
      correction: {
        lateMinutes: 28,
        reason: "Demo seed: late arrival.",
      },
    },
    {
      email: "sergey@demo.smart",
      action: "check_in_out",
      label: "пришел и ушел раньше",
      correction: {
        earlyLeaveMinutes: 75,
        reason: "Demo seed: early leave.",
      },
    },
    {
      email: "maria@demo.smart",
      action: "no_show",
      label: "не пришла",
    },
  ];

  const summary = [];

  for (const item of attendancePlan) {
    const employee = employeesByEmail.get(item.email);
    const loginConfig = EMPLOYEE_LOGINS.get(item.email);
    if (!employee || !loginConfig) {
      summary.push(`${item.email}: employee not found`);
      continue;
    }

    if (item.action === "no_show") {
      summary.push(`${fullName(employee)}: ${item.label}`);
      continue;
    }

    try {
      await setWorkMode(ownerToken, employee.id, "FIELD");

      const locationRecord = locationsById.get(employee.primaryLocationId) ?? locationsById.values().next().value;
      if (!locationRecord) {
        throw new Error(`No location coordinates found for ${fullName(employee)}.`);
      }

      const location = {
        latitude: Number(locationRecord.latitude),
        longitude: Number(locationRecord.longitude),
      };

      const ownFaceDataUrl =
        (await employeeFaceDataUrl(ownerToken, employee.id).catch(() => null)) ?? baseFaceDataUrl;
      const checkIn = await checkInEmployee({
        employee,
        loginConfig,
        faceDataUrl: ownFaceDataUrl,
        location,
        notes: `Demo seed: ${item.label}.`,
        today,
      });

      let sessionId = checkIn.sessionId;
      let checkedOut = false;

      if (item.action === "check_in_out" && checkIn.token && checkIn.state !== "checked_out") {
        const checkOut = await checkOutEmployee({
          token: checkIn.token,
          deviceFingerprint: checkIn.deviceFingerprint,
          location: checkIn.location,
          faceDataUrl: ownFaceDataUrl,
          notes: "Demo seed: early leave.",
        });
        sessionId = checkOut.sessionId ?? sessionId;
        checkedOut = true;
      }

      if (item.correction && sessionId) {
        await correctSession(ownerToken, sessionId, item.correction);
      }

      summary.push(
        `${fullName(employee)}: ${item.label}${
          checkIn.skipped ? ` (skip: ${checkIn.state})` : ""
        }${checkedOut ? " + check-out" : ""}`,
      );
    } catch (error) {
      const message = String(error?.message ?? error).replace(/\s+/g, " ").slice(0, 180);
      summary.push(`${fullName(employee)}: ${item.label} не записано (${message})`);
    }
  }

  return summary;
}

async function main() {
  const ownerAuth = await login(OWNER_EMAIL, OWNER_PASSWORD);
  const ownerToken = ownerAuth.accessToken;
  const serverNow = ownerAuth.serverDate ? new Date(ownerAuth.serverDate) : new Date();
  const today = serverNow.toISOString().slice(0, 10);

  const { payload: employees } = await request("/employees", { token: ownerToken });
  const employeesByEmail = new Map(
    employees
      .filter((employee) => EMPLOYEE_LOGINS.has(emailOf(employee)))
      .map((employee) => [emailOf(employee), employee]),
  );
  const locations = await listLocations(ownerToken);
  const locationsById = new Map(locations.map((location) => [location.id, location]));

  const baseFaceEmployee =
    employeesByEmail.get("employee@demo.smart") ?? employeesByEmail.get(OWNER_EMAIL);
  if (!baseFaceEmployee) {
    throw new Error("No demo employee with biometric reference found.");
  }

  const baseFaceDataUrl = await employeeFaceDataUrl(ownerToken, baseFaceEmployee.id);
  if (!baseFaceDataUrl) {
    throw new Error(`No biometric template URL for ${fullName(baseFaceEmployee)}.`);
  }

  const tasks = await seedTasks(ownerToken, employeesByEmail, baseFaceDataUrl, serverNow);
  const attendanceSummary = await seedAttendance(
    ownerToken,
    employeesByEmail,
    locationsById,
    baseFaceDataUrl,
    today,
  );

  const { payload: live } = await request("/attendance/team/live", { token: ownerToken }).catch((error) => ({
    payload: [],
    error,
  }));
  const { payload: anomalies } = await request(`/attendance/team/anomalies?date=${today}`, {
    token: ownerToken,
  }).catch((error) => ({
    payload: [],
    error,
  }));

  console.log(
    JSON.stringify(
      {
        apiBase: API_BASE,
        date: today,
        attendance: attendanceSummary,
        createdTasks: tasks.created,
        skippedTasks: tasks.skipped,
        liveSessions: live.map((session) => ({
          employee: `${session.employee.firstName} ${session.employee.lastName}`,
          status: session.status,
          lateMinutes: session.lateMinutes,
          earlyLeaveMinutes: session.earlyLeaveMinutes,
        })),
        anomalies: anomalies.map((item) => ({
          employee: item.employeeName,
          type: item.type,
          severity: item.severity,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
