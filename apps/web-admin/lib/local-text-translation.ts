import type { Locale } from "./i18n";

const RU_TO_EN_TEXT_MAP: Record<string, string> = {
  "Проверить табель за первую половину месяца":
    "Review the timesheet for the first half of the month",
  "Сверить отметки прихода и комментарии по отклонениям.":
    "Review attendance punches and comments on deviations.",
  "Сверить отметки прихода и подготовить комментарии по отклонениям.":
    "Compare attendance punches and prepare comments on deviations.",
  "Проверить опоздания по группе A": "Review late arrivals for group A",
  "Подготовить комментарии руководителю": "Prepare comments for the manager",
  "Ежедневный синк по сменам": "Daily shift sync",
  "Обсуждение покрытия вечерних смен.": "Discuss evening shift coverage.",
  "Обсуждение покрытия вечерних смен и замен на выходные.":
    "Discuss evening shift coverage and weekend substitutions.",
  "Подготовить список сотрудников на обучение": "Prepare the training shortlist",
  "Собрать кандидатов на внутреннее обучение в апреле.":
    "Gather candidates for internal training in April.",
  "Собрать кандидатов на апрельское внутреннее обучение и согласовать отделы.":
    "Gather candidates for April internal training and align with departments.",
  "Подтвердить подменный состав": "Confirm the backup staffing roster",
  "Убедиться, что резерв на конец недели подтвержден.":
    "Make sure the end-of-week backup staffing is confirmed.",
  "Собрать комментарии по повторным опозданиям":
    "Collect notes on repeated late arrivals",
  "Подготовить short summary для HR.": "Prepare a short summary for HR.",
  "Открыть новый onboarding-поток": "Launch a new onboarding flow",
  "Групповая задача для People Ops.": "Group task for People Ops.",
  "Разбор опозданий за неделю": "Weekly late-arrival review",
  "Короткий созвон с HR по повторяющимся опозданиям.":
    "Short call with HR about repeated late arrivals.",
  "Проверить подтверждение смен на вечер":
    "Review evening shift confirmations",
  "Проверить, кто подтвердил вечерние смены на пятницу, и закрыть незаполненные слоты.":
    "Check who confirmed Friday evening shifts and close unfilled slots.",
  "Собрать причины опозданий по группе А":
    "Collect late-arrival reasons for group A",
  "Сверить объяснительные и обновить комментарии в табеле перед встречей с HR.":
    "Review explanations and update timesheet comments before the HR meeting.",
  "Проверить готовность формы отчета": "Check report form readiness",
  "Убедиться, что шаблон отчета по посещаемости заполнен и готов к отправке руководителю.":
    "Make sure the attendance report template is complete and ready to be sent to the manager.",
  "Подготовить рабочее место к открытию недели": "Prepare the workstation for the start of the week",
  "Проверить чек-лист витрины": "Check the display checklist",
  "Сверить остатки по расходным материалам": "Reconcile consumables stock levels",
  "Подтвердить запись клиентов на пятницу": "Confirm client bookings for Friday",
  "Подготовить зону ожидания к загрузке выходных": "Prepare the waiting area for the weekend rush",
  "Обновить отчет по допродажам": "Update the add-on sales report",
  "Проверить готовность кабинетов к вечерней смене": "Check room readiness for the evening shift",
  "Закрыть чек-лист подготовки к выходным": "Complete the weekend prep checklist",
  "Проверить наличие расходников на новой неделе": "Check consumables availability for the new week",
  "Собрать короткий отчет по отзывам клиентов": "Compile a short client feedback report",
  "Проверить готовность рабочих мест перед закрытием месяца":
    "Check workstation readiness before month-end close",
  "Обновить список расходников на 31 марта": "Update the consumables list for March 31",
  "Подтвердить расписание мастеров на первую неделю апреля":
    "Confirm the stylists' schedule for the first week of April",
  "Подготовить кабинет к пятничной загрузке": "Prepare the room for Friday demand",
  "Проверить наличие расходников на выходные": "Check consumables availability for the weekend",
  "Провести воскресную сверку записей": "Run the Sunday booking reconciliation",
  "Подтвердить подмену на понедельник": "Confirm the Monday cover shift",
  "Собрать расходники для окрашивания": "Prepare coloring supplies",
  "Обновить витрину сезонных услуг": "Refresh the seasonal services display",
  "Проверить подтверждения на четверг": "Check confirmations for Thursday",
  "Согласовать акции на следующую неделю": "Approve promotions for next week",
  "Подготовить список клиентов для напоминаний": "Prepare the client reminder list",
  "Проверить готовность кабинетов к вечерней загрузке":
    "Check room readiness for the evening rush",
  "Обновить чек-лист открытия смены": "Update the shift opening checklist",
  "Проверить подтверждения онлайн-записей": "Check online booking confirmations",
  "Подготовить короткий отчет по апрелю": "Prepare a short April report",
  "Собрать отзывы клиентов по итогам месяца": "Collect client feedback for the month",
  "Показательный набор задач для demo-режима.": "Demo-mode showcase task set.",
  "Переговорная B": "Meeting room B",
  "Кабинет менеджера": "Manager office",
};

export function getLocalTextTranslation(
  text: string,
  locale: Locale,
): string | null {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }

  if (locale === "en") {
    const directMatch = RU_TO_EN_TEXT_MAP[normalized];
    if (directMatch) {
      return directMatch;
    }

    const meetingMatch = normalized.match(/^Встреча:\s*(.+)$/i);
    if (meetingMatch) {
      const translatedSubject: string =
        getLocalTextTranslation(meetingMatch[1], locale) ?? meetingMatch[1];
      return `Meeting: ${translatedSubject}`;
    }

    return null;
  }

  return null;
}
