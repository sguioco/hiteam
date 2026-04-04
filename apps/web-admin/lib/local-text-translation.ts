import type { Locale } from "./i18n";

const RU_TO_EN_TEXT_MAP: Record<string, string> = {
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

export function getLocalTextTranslation(text: string, locale: Locale) {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }

  if (locale === "en") {
    return RU_TO_EN_TEXT_MAP[normalized] ?? null;
  }

  return null;
}
