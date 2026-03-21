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

function humanizeSingleValidationError(message: string): string {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return message;
  }

  const invalidDateMatch = trimmedMessage.match(/^(\w+) must be a valid ISO 8601 date string$/);
  if (invalidDateMatch) {
    const field = invalidDateMatch[1];
    if (field === "birthDate") {
      return "Укажите дату рождения";
    }
  }

  const emptyFieldMatch = trimmedMessage.match(/^(\w+) should not be empty$/);
  if (emptyFieldMatch) {
    const field = emptyFieldMatch[1];
    const label = FIELD_ACCUSATIVE_LABELS[field];
    if (label) {
      return `Укажите ${label}`;
    }
  }

  const stringFieldMatch = trimmedMessage.match(/^(\w+) must be a string$/);
  if (stringFieldMatch) {
    const field = stringFieldMatch[1];
    const label = FIELD_ACCUSATIVE_LABELS[field];
    if (label) {
      return `Укажите ${label}`;
    }
  }

  const minLengthMatch = trimmedMessage.match(/^(\w+) must be longer than or equal to (\d+) characters$/);
  if (minLengthMatch) {
    const [, field, rawMinLength] = minLengthMatch;
    const minLength = Number(rawMinLength);
    if (field === "password") {
      return `Пароль должен содержать минимум ${minLength} символов`;
    }

    const label = FIELD_NOMINATIVE_LABELS[field];
    if (label) {
      return `${label} должно содержать минимум ${minLength} символов`;
    }
  }

  const invalidChoiceMatch = trimmedMessage.match(/^(\w+) must be one of the following values: (.+)$/);
  if (invalidChoiceMatch) {
    const field = invalidChoiceMatch[1];
    if (field === "gender") {
      return "Выберите пол";
    }

    const label = FIELD_ACCUSATIVE_LABELS[field];
    if (label) {
      return `Выберите ${label}`;
    }
  }

  const invalidEmailMatch = trimmedMessage.match(/^(\w+) must be an email$/);
  if (invalidEmailMatch) {
    return "Укажите корректный email";
  }

  return trimmedMessage;
}

export function humanizeValidationError(message: string | string[]): string {
  const sourceMessages = Array.isArray(message) ? message : [message];
  const normalizedMessages = sourceMessages
    .map((item) => humanizeSingleValidationError(item))
    .filter(Boolean);

  const uniqueMessages = normalizedMessages.filter((item, index) => normalizedMessages.indexOf(item) === index);
  if (!uniqueMessages.length) {
    return Array.isArray(message) ? message.join(", ") : message;
  }

  return uniqueMessages
    .map((item, index) => (index === 0 ? capitalize(item) : item))
    .join(". ");
}
