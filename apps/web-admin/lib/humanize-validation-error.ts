import { getRuntimeLocale, type RuntimeLocale } from "./runtime-locale";

const FIELD_ACCUSATIVE_LABELS: Record<string, string> = {
  password: "пароль",
  firstName: "имя",
  lastName: "фамилию",
  middleName: "отчество",
  birthDate: "дату рождения",
  gender: "пол",
  phone: "телефон",
  email: "email",
};

const FIELD_ENGLISH_LABELS: Record<string, string> = {
  password: "password",
  firstName: "first name",
  lastName: "last name",
  middleName: "middle name",
  birthDate: "birth date",
  gender: "gender",
  phone: "phone number",
  email: "email",
};

const FIELD_NOMINATIVE_LABELS: Record<string, string> = {
  password: "Пароль",
  firstName: "Имя",
  lastName: "Фамилия",
  middleName: "Отчество",
  birthDate: "Дата рождения",
  gender: "Пол",
  phone: "Телефон",
  email: "Email",
};

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function keepMessageInLocale(message: string, locale: RuntimeLocale) {
  if (locale === "en" && /[А-Яа-яЁё]/.test(message)) {
    return "Unable to complete the request. Check the entered data and try again";
  }

  if (
    locale === "ru" &&
    !/[А-Яа-яЁё]/.test(message) &&
    /[A-Za-z]{3,}/.test(message)
  ) {
    return "Не удалось выполнить запрос. Проверьте введённые данные и попробуйте ещё раз";
  }

  return message;
}

function humanizeSingleValidationError(
  message: string,
  locale: RuntimeLocale,
): string {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return message;
  }

  const invalidDateMatch = trimmedMessage.match(/^(\w+) must be a valid ISO 8601 date string$/);
  if (invalidDateMatch) {
    const field = invalidDateMatch[1];
    if (field === "birthDate") {
      return locale === "ru"
        ? "Укажите дату рождения"
        : "Enter a valid birth date";
    }
  }

  const emptyFieldMatch = trimmedMessage.match(/^(\w+) should not be empty$/);
  if (emptyFieldMatch) {
    const field = emptyFieldMatch[1];
    const label =
      locale === "ru"
        ? FIELD_ACCUSATIVE_LABELS[field]
        : FIELD_ENGLISH_LABELS[field];
    if (label) {
      return locale === "ru" ? `Укажите ${label}` : `Enter ${label}`;
    }
  }

  const stringFieldMatch = trimmedMessage.match(/^(\w+) must be a string$/);
  if (stringFieldMatch) {
    const field = stringFieldMatch[1];
    const label =
      locale === "ru"
        ? FIELD_ACCUSATIVE_LABELS[field]
        : FIELD_ENGLISH_LABELS[field];
    if (label) {
      return locale === "ru" ? `Укажите ${label}` : `Enter ${label}`;
    }
  }

  const minLengthMatch = trimmedMessage.match(/^(\w+) must be longer than or equal to (\d+) characters$/);
  if (minLengthMatch) {
    const [, field, rawMinLength] = minLengthMatch;
    const minLength = Number(rawMinLength);
    if (field === "password") {
      return locale === "ru"
        ? `Пароль должен содержать минимум ${minLength} символов`
        : `Password must contain at least ${minLength} characters`;
    }

    const label =
      locale === "ru"
        ? FIELD_NOMINATIVE_LABELS[field]
        : FIELD_ENGLISH_LABELS[field];
    if (label) {
      return locale === "ru"
        ? `Значение поля «${label.toLowerCase()}» должно содержать минимум ${minLength} символов`
        : `${capitalize(label)} must contain at least ${minLength} characters`;
    }
  }

  const invalidChoiceMatch = trimmedMessage.match(/^(\w+) must be one of the following values: (.+)$/);
  if (invalidChoiceMatch) {
    const field = invalidChoiceMatch[1];
    if (field === "gender") {
      return locale === "ru" ? "Выберите пол" : "Select gender";
    }

    const label =
      locale === "ru"
        ? FIELD_ACCUSATIVE_LABELS[field]
        : FIELD_ENGLISH_LABELS[field];
    if (label) {
      return locale === "ru" ? `Выберите ${label}` : `Select ${label}`;
    }
  }

  const invalidEmailMatch = trimmedMessage.match(/^(\w+) must be an email$/);
  if (invalidEmailMatch) {
    return locale === "ru"
      ? "Укажите корректный email"
      : "Enter a valid email address";
  }

  return trimmedMessage;
}

export function humanizeValidationError(
  message: string | string[],
  locale: RuntimeLocale = getRuntimeLocale(),
): string {
  const sourceMessages = Array.isArray(message) ? message : [message];
  const normalizedMessages = sourceMessages
    .map((item) =>
      keepMessageInLocale(humanizeSingleValidationError(item, locale), locale),
    )
    .filter(Boolean);

  const uniqueMessages = normalizedMessages.filter((item, index) => normalizedMessages.indexOf(item) === index);
  if (!uniqueMessages.length) {
    return Array.isArray(message) ? message.join(", ") : message;
  }

  return uniqueMessages
    .map((item, index) => (index === 0 ? capitalize(item) : item))
    .join(". ");
}
