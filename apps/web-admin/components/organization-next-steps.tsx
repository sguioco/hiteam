import { toAdminHref } from "../lib/admin-routes";

export function OrganizationNextSteps({ attendance, locale }: { attendance: boolean; locale: string }) {
  const ru = locale === "ru";
  const steps = [
    { href: "/employees?focusAddEmployee=1", title: ru ? "1. Пригласите сотрудников" : "1. Invite employees", description: ru ? "Отправьте приглашения, чтобы сотрудники могли войти в приложение." : "Send invitations so employees can sign in to the app." },
    { href: attendance ? "/schedule" : "/tasks", title: attendance ? (ru ? "2. Запланируйте смену" : "2. Plan a shift") : (ru ? "2. Назначьте задачу" : "2. Assign a task"), description: attendance ? (ru ? "Выберите сотрудника, локацию и время в календаре." : "Choose an employee, location and time in the calendar.") : (ru ? "Выберите исполнителя, срок и при необходимости чек-лист." : "Choose an assignee, deadline and an optional checklist.") },
  ];
  return <section className="mb-6 rounded-3xl border border-blue-200 bg-white p-6" aria-labelledby="setup-next-steps">
    <h2 id="setup-next-steps" className="text-xl font-semibold">{ru ? "Компания настроена. Что дальше?" : "Your company is ready. What’s next?"}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{ru ? "Начните с приглашения сотрудников, затем запланируйте первую работу." : "Start by inviting employees, then plan their first assignment."}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{steps.map(step => <a key={step.href} href={toAdminHref(step.href)} className="rounded-2xl border p-4 hover:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
      <span className="font-semibold text-blue-600">{step.title}</span><p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
    </a>)}</div>
  </section>;
}
