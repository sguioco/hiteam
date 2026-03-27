import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { JwtUser } from "../../common/interfaces/jwt-user.interface";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AddTaskCommentDto } from "./dto/add-task-comment.dto";
import { BulkRemindTasksDto } from "./dto/bulk-remind-tasks.dto";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { CreateAnnouncementTemplateDto } from "./dto/create-announcement-template.dto";
import { CreateChatThreadDto } from "./dto/create-chat-thread.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { CreateTaskPhotoProofDto } from "./dto/create-task-photo-proof.dto";
import { CreateTaskTemplateDto } from "./dto/create-task-template.dto";
import { ListManagerTasksQueryDto } from "./dto/list-manager-tasks-query.dto";
import { RescheduleTaskDto } from "./dto/reschedule-task.dto";
import { SendChatMessageDto } from "./dto/send-chat-message.dto";
import { SetGroupMembersDto } from "./dto/set-group-members.dto";
import { ToggleAnnouncementTemplateDto } from "./dto/toggle-announcement-template.dto";
import { SetTaskStatusDto } from "./dto/set-task-status.dto";
import { ToggleTaskTemplateDto } from "./dto/toggle-task-template.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { UpdateAnnouncementTemplateDto } from "./dto/update-announcement-template.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";
import { UpdateTaskAutomationPolicyDto } from "./dto/update-task-automation-policy.dto";
import { CollaborationService } from "./collaboration.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("collaboration")
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("groups")
  groups(@CurrentUser() user: JwtUser) {
    return this.collaborationService.listGroups(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("groups")
  createGroup(@CurrentUser() user: JwtUser, @Body() dto: CreateGroupDto) {
    return this.collaborationService.createGroup(user.sub, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Patch("groups/:groupId")
  updateGroup(
    @CurrentUser() user: JwtUser,
    @Param("groupId") groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.collaborationService.updateGroup(user.sub, groupId, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Delete("groups/:groupId")
  deleteGroup(@CurrentUser() user: JwtUser, @Param("groupId") groupId: string) {
    return this.collaborationService.deleteGroup(user.sub, groupId);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("groups/:groupId/members")
  setGroupMembers(
    @CurrentUser() user: JwtUser,
    @Param("groupId") groupId: string,
    @Body() dto: SetGroupMembersDto,
  ) {
    return this.collaborationService.setGroupMembers(user.sub, groupId, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("overview")
  overview(@CurrentUser() user: JwtUser) {
    return this.collaborationService.managerOverview(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("analytics")
  analytics(@CurrentUser() user: JwtUser, @Query("days") days?: string) {
    return this.collaborationService.managerAnalytics(
      user.sub,
      days ? Number(days) : undefined,
    );
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("announcements")
  announcements(@CurrentUser() user: JwtUser) {
    return this.collaborationService.listAnnouncementsForManager(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("announcements/archive")
  announcementArchive(@CurrentUser() user: JwtUser) {
    return this.collaborationService.listAnnouncementArchive(user.sub);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("announcements/me")
  myAnnouncements(@CurrentUser() user: JwtUser) {
    return this.collaborationService.listMyAnnouncements(user.sub);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("announcements/:announcementId/read")
  markAnnouncementRead(
    @CurrentUser() user: JwtUser,
    @Param("announcementId") announcementId: string,
  ) {
    return this.collaborationService.markAnnouncementRead(user.sub, announcementId);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("announcements")
  createAnnouncement(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.collaborationService.createAnnouncement(user.sub, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("announcements/:announcementId/readers")
  announcementReaders(
    @CurrentUser() user: JwtUser,
    @Param("announcementId") announcementId: string,
  ) {
    return this.collaborationService.listAnnouncementReaders(user.sub, announcementId);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Patch("announcements/:announcementId")
  updateAnnouncement(
    @CurrentUser() user: JwtUser,
    @Param("announcementId") announcementId: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.collaborationService.updateAnnouncement(
      user.sub,
      announcementId,
      dto,
    );
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Delete("announcements/:announcementId")
  deleteAnnouncement(
    @CurrentUser() user: JwtUser,
    @Param("announcementId") announcementId: string,
  ) {
    return this.collaborationService.deleteAnnouncement(user.sub, announcementId);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("announcement-templates")
  announcementTemplates(@CurrentUser() user: JwtUser) {
    return this.collaborationService.listAnnouncementTemplates(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("announcement-templates")
  createAnnouncementTemplate(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateAnnouncementTemplateDto,
  ) {
    return this.collaborationService.createAnnouncementTemplate(user.sub, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("announcement-templates/run-due")
  runDueAnnouncementTemplates(@CurrentUser() user: JwtUser) {
    return this.collaborationService.runDueAnnouncementTemplates(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("announcement-templates/:templateId")
  updateAnnouncementTemplate(
    @CurrentUser() user: JwtUser,
    @Param("templateId") templateId: string,
    @Body() dto: UpdateAnnouncementTemplateDto,
  ) {
    return this.collaborationService.updateAnnouncementTemplate(
      user.sub,
      templateId,
      dto,
    );
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("announcement-templates/:templateId/toggle")
  toggleAnnouncementTemplate(
    @CurrentUser() user: JwtUser,
    @Param("templateId") templateId: string,
    @Body() dto: ToggleAnnouncementTemplateDto,
  ) {
    return this.collaborationService.toggleAnnouncementTemplate(
      user.sub,
      templateId,
      dto,
    );
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("announcement-templates/:templateId/delete")
  deleteAnnouncementTemplate(
    @CurrentUser() user: JwtUser,
    @Param("templateId") templateId: string,
  ) {
    return this.collaborationService.deleteAnnouncementTemplate(
      user.sub,
      templateId,
    );
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks")
  createTask(@CurrentUser() user: JwtUser, @Body() dto: CreateTaskDto) {
    return this.collaborationService.createTask(user.sub, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("task-templates")
  taskTemplates(@CurrentUser() user: JwtUser) {
    return this.collaborationService.listTaskTemplates(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("task-templates")
  createTaskTemplate(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateTaskTemplateDto,
  ) {
    return this.collaborationService.createTaskTemplate(user.sub, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("task-templates/run-due")
  runDueTaskTemplates(@CurrentUser() user: JwtUser) {
    return this.collaborationService.runDueTaskTemplates(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("task-templates/:templateId")
  updateTaskTemplate(
    @CurrentUser() user: JwtUser,
    @Param("templateId") templateId: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    return this.collaborationService.updateTaskTemplate(
      user.sub,
      templateId,
      dto,
    );
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("task-templates/:templateId/toggle")
  toggleTaskTemplate(
    @CurrentUser() user: JwtUser,
    @Param("templateId") templateId: string,
    @Body() dto: ToggleTaskTemplateDto,
  ) {
    return this.collaborationService.toggleTaskTemplate(
      user.sub,
      templateId,
      dto,
    );
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("task-templates/:templateId/delete")
  deleteTaskTemplate(
    @CurrentUser() user: JwtUser,
    @Param("templateId") templateId: string,
  ) {
    return this.collaborationService.deleteTaskTemplate(user.sub, templateId);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("tasks")
  managerTasks(
    @CurrentUser() user: JwtUser,
    @Query() query: ListManagerTasksQueryDto,
  ) {
    return this.collaborationService.listManagerTasks(user.sub, query);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks/:taskId/remind")
  remindTask(@CurrentUser() user: JwtUser, @Param("taskId") taskId: string) {
    return this.collaborationService.remindTask(user.sub, taskId);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks/remind-overdue")
  remindOverdue(@CurrentUser() user: JwtUser, @Body() dto: BulkRemindTasksDto) {
    return this.collaborationService.remindOverdueTasks(user.sub, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("automation/policy")
  automationPolicy(@CurrentUser() user: JwtUser) {
    return this.collaborationService.getTaskAutomationPolicy(user.sub);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("automation/policy")
  updateAutomationPolicy(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateTaskAutomationPolicyDto,
  ) {
    return this.collaborationService.updateTaskAutomationPolicy(user.sub, dto);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("automation/run")
  runAutomation(@CurrentUser() user: JwtUser) {
    return this.collaborationService.runTaskAutomation(user.sub);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("tasks/me")
  myTasks(
    @CurrentUser() user: JwtUser,
    @Query("date") date?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.collaborationService.listMyTasks(user.sub, {
      date,
      dateFrom,
      dateTo,
    });
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("inbox/me")
  myInbox(@CurrentUser() user: JwtUser) {
    return this.collaborationService.getEmployeeInbox(user.sub);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("inbox-summary/me")
  myInboxSummary(@CurrentUser() user: JwtUser) {
    return this.collaborationService.getEmployeeInboxSummary(user.sub);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("chats")
  chats(@CurrentUser() user: JwtUser) {
    return this.collaborationService.listChats(user.sub);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("chats")
  createChat(@CurrentUser() user: JwtUser, @Body() dto: CreateChatThreadDto) {
    return this.collaborationService.createChat(user.sub, dto);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("chats/:threadId")
  chatDetails(
    @CurrentUser() user: JwtUser,
    @Param("threadId") threadId: string,
  ) {
    return this.collaborationService.getChat(user.sub, threadId);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("chats/:threadId/messages")
  sendChatMessage(
    @CurrentUser() user: JwtUser,
    @Param("threadId") threadId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.collaborationService.sendChatMessage(user.sub, threadId, dto);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("chats/:threadId/read")
  markChatRead(
    @CurrentUser() user: JwtUser,
    @Param("threadId") threadId: string,
  ) {
    return this.collaborationService.markChatRead(user.sub, threadId);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks/:taskId/status")
  setTaskStatus(
    @CurrentUser() user: JwtUser,
    @Param("taskId") taskId: string,
    @Body() dto: SetTaskStatusDto,
  ) {
    return this.collaborationService.setTaskStatus(user.sub, taskId, dto);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks/:taskId/reschedule")
  rescheduleTask(
    @CurrentUser() user: JwtUser,
    @Param("taskId") taskId: string,
    @Body() dto: RescheduleTaskDto,
  ) {
    return this.collaborationService.rescheduleTask(user.sub, taskId, dto);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks/:taskId/checklist/:itemId/toggle")
  toggleChecklistItem(
    @CurrentUser() user: JwtUser,
    @Param("taskId") taskId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.collaborationService.toggleChecklistItem(
      user.sub,
      taskId,
      itemId,
    );
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks/:taskId/comments")
  addComment(
    @CurrentUser() user: JwtUser,
    @Param("taskId") taskId: string,
    @Body() dto: AddTaskCommentDto,
  ) {
    return this.collaborationService.addTaskComment(user.sub, taskId, dto.body);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Post("tasks/:taskId/photo-proofs")
  addTaskPhotoProof(
    @CurrentUser() user: JwtUser,
    @Param("taskId") taskId: string,
    @Body() dto: CreateTaskPhotoProofDto,
  ) {
    return this.collaborationService.addTaskPhotoProof(user.sub, taskId, dto);
  }

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Delete("tasks/:taskId/photo-proofs/:proofId")
  deleteTaskPhotoProof(
    @CurrentUser() user: JwtUser,
    @Param("taskId") taskId: string,
    @Param("proofId") proofId: string,
  ) {
    return this.collaborationService.deleteTaskPhotoProof(
      user.sub,
      taskId,
      proofId,
    );
  }
}
