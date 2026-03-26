--
-- PostgreSQL database dump
--

\restrict Q3zVBbV7ntp7TjtHVZAbecUFpssGMyQiJNIxxqaeiahpj42sPkgPtvPWmcReyp2

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg12+1)
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."WorkGroup" DROP CONSTRAINT IF EXISTS "WorkGroup_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."WorkGroup" DROP CONSTRAINT IF EXISTS "WorkGroup_managerEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."WorkGroupMembership" DROP CONSTRAINT IF EXISTS "WorkGroupMembership_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."WorkGroupMembership" DROP CONSTRAINT IF EXISTS "WorkGroupMembership_groupId_fkey";
ALTER TABLE IF EXISTS ONLY public."WorkGroupMembership" DROP CONSTRAINT IF EXISTS "WorkGroupMembership_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_roleId_fkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_managerEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_groupId_fkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_assigneeEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskTemplate" DROP CONSTRAINT IF EXISTS "TaskTemplate_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskTemplate" DROP CONSTRAINT IF EXISTS "TaskTemplate_managerEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskTemplate" DROP CONSTRAINT IF EXISTS "TaskTemplate_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskTemplate" DROP CONSTRAINT IF EXISTS "TaskTemplate_groupId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskTemplate" DROP CONSTRAINT IF EXISTS "TaskTemplate_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskTemplate" DROP CONSTRAINT IF EXISTS "TaskTemplate_assigneeEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskPhotoProof" DROP CONSTRAINT IF EXISTS "TaskPhotoProof_uploadedByEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskPhotoProof" DROP CONSTRAINT IF EXISTS "TaskPhotoProof_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskPhotoProof" DROP CONSTRAINT IF EXISTS "TaskPhotoProof_taskId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskPhotoProof" DROP CONSTRAINT IF EXISTS "TaskPhotoProof_taskCompletionId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskPhotoProof" DROP CONSTRAINT IF EXISTS "TaskPhotoProof_supersededByProofId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskCompletion" DROP CONSTRAINT IF EXISTS "TaskCompletion_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskCompletion" DROP CONSTRAINT IF EXISTS "TaskCompletion_taskTemplateId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskCompletion" DROP CONSTRAINT IF EXISTS "TaskCompletion_assigneeEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskChecklistItem" DROP CONSTRAINT IF EXISTS "TaskChecklistItem_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskChecklistItem" DROP CONSTRAINT IF EXISTS "TaskChecklistItem_taskId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskChecklistItem" DROP CONSTRAINT IF EXISTS "TaskChecklistItem_completedByEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskAutomationPolicy" DROP CONSTRAINT IF EXISTS "TaskAutomationPolicy_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskActivity" DROP CONSTRAINT IF EXISTS "TaskActivity_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskActivity" DROP CONSTRAINT IF EXISTS "TaskActivity_taskId_fkey";
ALTER TABLE IF EXISTS ONLY public."TaskActivity" DROP CONSTRAINT IF EXISTS "TaskActivity_actorEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."Shift" DROP CONSTRAINT IF EXISTS "Shift_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Shift" DROP CONSTRAINT IF EXISTS "Shift_templateId_fkey";
ALTER TABLE IF EXISTS ONLY public."Shift" DROP CONSTRAINT IF EXISTS "Shift_positionId_fkey";
ALTER TABLE IF EXISTS ONLY public."Shift" DROP CONSTRAINT IF EXISTS "Shift_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Shift" DROP CONSTRAINT IF EXISTS "Shift_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."ShiftTemplate" DROP CONSTRAINT IF EXISTS "ShiftTemplate_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ShiftTemplate" DROP CONSTRAINT IF EXISTS "ShiftTemplate_positionId_fkey";
ALTER TABLE IF EXISTS ONLY public."ShiftTemplate" DROP CONSTRAINT IF EXISTS "ShiftTemplate_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestComment" DROP CONSTRAINT IF EXISTS "RequestComment_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestComment" DROP CONSTRAINT IF EXISTS "RequestComment_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestComment" DROP CONSTRAINT IF EXISTS "RequestComment_authorEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestAttachment" DROP CONSTRAINT IF EXISTS "RequestAttachment_uploadedByEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestAttachment" DROP CONSTRAINT IF EXISTS "RequestAttachment_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestAttachment" DROP CONSTRAINT IF EXISTS "RequestAttachment_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestApprovalStep" DROP CONSTRAINT IF EXISTS "RequestApprovalStep_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestApprovalStep" DROP CONSTRAINT IF EXISTS "RequestApprovalStep_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."RequestApprovalStep" DROP CONSTRAINT IF EXISTS "RequestApprovalStep_approverEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."PushDevice" DROP CONSTRAINT IF EXISTS "PushDevice_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."PushDevice" DROP CONSTRAINT IF EXISTS "PushDevice_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."PushDelivery" DROP CONSTRAINT IF EXISTS "PushDelivery_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."PushDelivery" DROP CONSTRAINT IF EXISTS "PushDelivery_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."PushDelivery" DROP CONSTRAINT IF EXISTS "PushDelivery_notificationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Position" DROP CONSTRAINT IF EXISTS "Position_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."PayrollPolicy" DROP CONSTRAINT IF EXISTS "PayrollPolicy_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Location" DROP CONSTRAINT IF EXISTS "Location_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Location" DROP CONSTRAINT IF EXISTS "Location_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."HolidayCalendarDay" DROP CONSTRAINT IF EXISTS "HolidayCalendarDay_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_requestedByUserId_fkey";
ALTER TABLE IF EXISTS ONLY public."Employee" DROP CONSTRAINT IF EXISTS "Employee_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Employee" DROP CONSTRAINT IF EXISTS "Employee_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Employee" DROP CONSTRAINT IF EXISTS "Employee_primaryLocationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Employee" DROP CONSTRAINT IF EXISTS "Employee_positionId_fkey";
ALTER TABLE IF EXISTS ONLY public."Employee" DROP CONSTRAINT IF EXISTS "Employee_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."Employee" DROP CONSTRAINT IF EXISTS "Employee_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffTransaction" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffTransaction_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffTransaction" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffTransaction_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffTransaction" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffTransaction_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffTransaction" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffTransaction_balanceId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffBalance" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffBalance_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffBalance" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffBalance_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeRequest" DROP CONSTRAINT IF EXISTS "EmployeeRequest_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeRequest" DROP CONSTRAINT IF EXISTS "EmployeeRequest_relatedRequestId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeRequest" DROP CONSTRAINT IF EXISTS "EmployeeRequest_managerEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeRequest" DROP CONSTRAINT IF EXISTS "EmployeeRequest_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_invitedByUserId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_approvedShiftTemplateId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_approvedGroupId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_approvedByUserId_fkey";
ALTER TABLE IF EXISTS ONLY public."DiagnosticsSnapshot" DROP CONSTRAINT IF EXISTS "DiagnosticsSnapshot_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."DiagnosticsPolicy" DROP CONSTRAINT IF EXISTS "DiagnosticsPolicy_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Device" DROP CONSTRAINT IF EXISTS "Device_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."Department" DROP CONSTRAINT IF EXISTS "Department_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Company" DROP CONSTRAINT IF EXISTS "Company_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatThread" DROP CONSTRAINT IF EXISTS "ChatThread_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatThread" DROP CONSTRAINT IF EXISTS "ChatThread_groupId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatThread" DROP CONSTRAINT IF EXISTS "ChatThread_createdByEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatParticipant" DROP CONSTRAINT IF EXISTS "ChatParticipant_threadId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatParticipant" DROP CONSTRAINT IF EXISTS "ChatParticipant_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatParticipant" DROP CONSTRAINT IF EXISTS "ChatParticipant_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_threadId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_authorEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricVerification" DROP CONSTRAINT IF EXISTS "BiometricVerification_reviewerEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricVerification" DROP CONSTRAINT IF EXISTS "BiometricVerification_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricVerification" DROP CONSTRAINT IF EXISTS "BiometricVerification_attendanceEventId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricProfile" DROP CONSTRAINT IF EXISTS "BiometricProfile_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricJob" DROP CONSTRAINT IF EXISTS "BiometricJob_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricJob" DROP CONSTRAINT IF EXISTS "BiometricJob_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricArtifact" DROP CONSTRAINT IF EXISTS "BiometricArtifact_verificationId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricArtifact" DROP CONSTRAINT IF EXISTS "BiometricArtifact_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."BiometricArtifact" DROP CONSTRAINT IF EXISTS "BiometricArtifact_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_shiftId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_checkOutEventId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_checkInEventId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceEvent" DROP CONSTRAINT IF EXISTS "AttendanceEvent_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceEvent" DROP CONSTRAINT IF EXISTS "AttendanceEvent_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceEvent" DROP CONSTRAINT IF EXISTS "AttendanceEvent_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceEvent" DROP CONSTRAINT IF EXISTS "AttendanceEvent_deviceId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionRequest" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionRequest_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionRequest" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionRequest_sessionId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionRequest" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionRequest_requestedByEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionRequest" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionRequest_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionRequest" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionRequest_approverEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionComment" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionComment_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionComment" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionComment_correctionRequestId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionComment" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionComment_authorEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceBreak" DROP CONSTRAINT IF EXISTS "AttendanceBreak_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceBreak" DROP CONSTRAINT IF EXISTS "AttendanceBreak_startEventId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceBreak" DROP CONSTRAINT IF EXISTS "AttendanceBreak_sessionId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceBreak" DROP CONSTRAINT IF EXISTS "AttendanceBreak_endEventId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceBreak" DROP CONSTRAINT IF EXISTS "AttendanceBreak_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceAnomalyNotification" DROP CONSTRAINT IF EXISTS "AttendanceAnomalyNotification_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ApprovalPolicy" DROP CONSTRAINT IF EXISTS "ApprovalPolicy_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."ApprovalPolicy" DROP CONSTRAINT IF EXISTS "ApprovalPolicy_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public."ApprovalPolicy" DROP CONSTRAINT IF EXISTS "ApprovalPolicy_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."ApprovalPolicy" DROP CONSTRAINT IF EXISTS "ApprovalPolicy_approverEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."Announcement" DROP CONSTRAINT IF EXISTS "Announcement_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."Announcement" DROP CONSTRAINT IF EXISTS "Announcement_targetEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."Announcement" DROP CONSTRAINT IF EXISTS "Announcement_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Announcement" DROP CONSTRAINT IF EXISTS "Announcement_groupId_fkey";
ALTER TABLE IF EXISTS ONLY public."Announcement" DROP CONSTRAINT IF EXISTS "Announcement_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."Announcement" DROP CONSTRAINT IF EXISTS "Announcement_authorEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AnnouncementTemplate" DROP CONSTRAINT IF EXISTS "AnnouncementTemplate_tenantId_fkey";
ALTER TABLE IF EXISTS ONLY public."AnnouncementTemplate" DROP CONSTRAINT IF EXISTS "AnnouncementTemplate_targetEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AnnouncementTemplate" DROP CONSTRAINT IF EXISTS "AnnouncementTemplate_managerEmployeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."AnnouncementTemplate" DROP CONSTRAINT IF EXISTS "AnnouncementTemplate_locationId_fkey";
ALTER TABLE IF EXISTS ONLY public."AnnouncementTemplate" DROP CONSTRAINT IF EXISTS "AnnouncementTemplate_groupId_fkey";
ALTER TABLE IF EXISTS ONLY public."AnnouncementTemplate" DROP CONSTRAINT IF EXISTS "AnnouncementTemplate_departmentId_fkey";
DROP INDEX IF EXISTS public."WorkGroup_tenantId_name_key";
DROP INDEX IF EXISTS public."WorkGroup_tenantId_managerEmployeeId_createdAt_idx";
DROP INDEX IF EXISTS public."WorkGroupMembership_tenantId_employeeId_createdAt_idx";
DROP INDEX IF EXISTS public."WorkGroupMembership_groupId_employeeId_key";
DROP INDEX IF EXISTS public."User_tenantId_email_key";
DROP INDEX IF EXISTS public."UserRole_userId_roleId_scopeType_scopeId_key";
DROP INDEX IF EXISTS public."Tenant_slug_key";
DROP INDEX IF EXISTS public."Task_tenantId_managerEmployeeId_createdAt_idx";
DROP INDEX IF EXISTS public."Task_tenantId_groupId_status_createdAt_idx";
DROP INDEX IF EXISTS public."Task_tenantId_assigneeEmployeeId_status_createdAt_idx";
DROP INDEX IF EXISTS public."TaskTemplate_tenantId_managerEmployeeId_isActive_createdAt_idx";
DROP INDEX IF EXISTS public."TaskTemplate_tenantId_locationId_isActive_createdAt_idx";
DROP INDEX IF EXISTS public."TaskTemplate_tenantId_groupId_isActive_createdAt_idx";
DROP INDEX IF EXISTS public."TaskTemplate_tenantId_departmentId_isActive_createdAt_idx";
DROP INDEX IF EXISTS public."TaskTemplate_tenantId_assigneeEmployeeId_isActive_createdAt_idx";
DROP INDEX IF EXISTS public."TaskPhotoProof_tenantId_uploadedByEmployeeId_createdAt_idx";
DROP INDEX IF EXISTS public."TaskPhotoProof_tenantId_taskId_createdAt_idx";
DROP INDEX IF EXISTS public."TaskPhotoProof_tenantId_taskCompletionId_createdAt_idx";
DROP INDEX IF EXISTS public."TaskCompletion_tenantId_taskTemplateId_occurrenceDate_idx";
DROP INDEX IF EXISTS public."TaskCompletion_tenantId_assigneeEmployeeId_occurrenceDate_idx";
DROP INDEX IF EXISTS public."TaskCompletion_taskTemplateId_assigneeEmployeeId_occurrence_key";
DROP INDEX IF EXISTS public."TaskChecklistItem_tenantId_taskId_sortOrder_idx";
DROP INDEX IF EXISTS public."TaskAutomationPolicy_tenantId_key";
DROP INDEX IF EXISTS public."TaskActivity_tenantId_taskId_createdAt_idx";
DROP INDEX IF EXISTS public."Shift_tenantId_employeeId_shiftDate_idx";
DROP INDEX IF EXISTS public."ShiftTemplate_tenantId_code_key";
DROP INDEX IF EXISTS public."Role_code_key";
DROP INDEX IF EXISTS public."RequestComment_tenantId_requestId_createdAt_idx";
DROP INDEX IF EXISTS public."RequestAttachment_tenantId_requestId_createdAt_idx";
DROP INDEX IF EXISTS public."RequestApprovalStep_tenantId_approverEmployeeId_status_crea_idx";
DROP INDEX IF EXISTS public."RequestApprovalStep_requestId_sequence_key";
DROP INDEX IF EXISTS public."PushDevice_token_key";
DROP INDEX IF EXISTS public."PushDevice_tenantId_userId_provider_isEnabled_idx";
DROP INDEX IF EXISTS public."PushDelivery_tenantId_userId_status_createdAt_idx";
DROP INDEX IF EXISTS public."Position_tenantId_code_key";
DROP INDEX IF EXISTS public."PayrollPolicy_tenantId_key";
DROP INDEX IF EXISTS public."Notification_tenantId_userId_isRead_createdAt_idx";
DROP INDEX IF EXISTS public."Location_tenantId_code_key";
DROP INDEX IF EXISTS public."HolidayCalendarDay_tenantId_date_key";
DROP INDEX IF EXISTS public."HolidayCalendarDay_tenantId_date_idx";
DROP INDEX IF EXISTS public."ExportJob_tenantId_type_status_createdAt_idx";
DROP INDEX IF EXISTS public."ExportJob_requestedByUserId_createdAt_idx";
DROP INDEX IF EXISTS public."Employee_userId_key";
DROP INDEX IF EXISTS public."Employee_tenantId_employeeNumber_key";
DROP INDEX IF EXISTS public."EmployeeTimeOffTransaction_tenantId_requestId_idx";
DROP INDEX IF EXISTS public."EmployeeTimeOffTransaction_tenantId_employeeId_kind_created_idx";
DROP INDEX IF EXISTS public."EmployeeTimeOffBalance_tenantId_kind_updatedAt_idx";
DROP INDEX IF EXISTS public."EmployeeTimeOffBalance_employeeId_kind_key";
DROP INDEX IF EXISTS public."EmployeeRequest_tenantId_employeeId_status_createdAt_idx";
DROP INDEX IF EXISTS public."EmployeeInvitation_userId_key";
DROP INDEX IF EXISTS public."EmployeeInvitation_tokenHash_key";
DROP INDEX IF EXISTS public."EmployeeInvitation_tenantId_status_invitedAt_idx";
DROP INDEX IF EXISTS public."EmployeeInvitation_tenantId_email_key";
DROP INDEX IF EXISTS public."EmployeeInvitation_employeeId_key";
DROP INDEX IF EXISTS public."DiagnosticsSnapshot_tenantId_capturedAt_idx";
DROP INDEX IF EXISTS public."DiagnosticsPolicy_tenantId_key";
DROP INDEX IF EXISTS public."Device_employeeId_deviceFingerprint_key";
DROP INDEX IF EXISTS public."Department_tenantId_code_key";
DROP INDEX IF EXISTS public."Company_tenantId_code_key";
DROP INDEX IF EXISTS public."ChatThread_tenantId_kind_updatedAt_idx";
DROP INDEX IF EXISTS public."ChatThread_tenantId_groupId_updatedAt_idx";
DROP INDEX IF EXISTS public."ChatParticipant_threadId_employeeId_key";
DROP INDEX IF EXISTS public."ChatParticipant_tenantId_employeeId_createdAt_idx";
DROP INDEX IF EXISTS public."ChatMessage_tenantId_threadId_createdAt_idx";
DROP INDEX IF EXISTS public."BiometricVerification_employeeId_manualReviewStatus_capture_idx";
DROP INDEX IF EXISTS public."BiometricProfile_employeeId_key";
DROP INDEX IF EXISTS public."BiometricJob_tenantId_employeeId_type_status_createdAt_idx";
DROP INDEX IF EXISTS public."BiometricArtifact_tenantId_employeeId_kind_createdAt_idx";
DROP INDEX IF EXISTS public."AttendanceSession_tenantId_employeeId_startedAt_idx";
DROP INDEX IF EXISTS public."AttendanceSession_checkOutEventId_key";
DROP INDEX IF EXISTS public."AttendanceSession_checkInEventId_key";
DROP INDEX IF EXISTS public."AttendanceEvent_tenantId_employeeId_occurredAt_idx";
DROP INDEX IF EXISTS public."AttendanceCorrectionRequest_tenantId_sessionId_createdAt_idx";
DROP INDEX IF EXISTS public."AttendanceCorrectionRequest_tenantId_employeeId_createdAt_idx";
DROP INDEX IF EXISTS public."AttendanceCorrectionRequest_tenantId_approverEmployeeId_sta_idx";
DROP INDEX IF EXISTS public."AttendanceCorrectionComment_tenantId_correctionRequestId_cr_idx";
DROP INDEX IF EXISTS public."AttendanceBreak_tenantId_sessionId_startedAt_idx";
DROP INDEX IF EXISTS public."AttendanceBreak_tenantId_employeeId_startedAt_idx";
DROP INDEX IF EXISTS public."AttendanceBreak_startEventId_key";
DROP INDEX IF EXISTS public."AttendanceBreak_endEventId_key";
DROP INDEX IF EXISTS public."AttendanceAnomalyNotification_tenantId_severity_createdAt_idx";
DROP INDEX IF EXISTS public."AttendanceAnomalyNotification_tenantId_anomalyKey_key";
DROP INDEX IF EXISTS public."ApprovalPolicy_tenantId_requestType_departmentId_locationId_idx";
DROP INDEX IF EXISTS public."Announcement_tenantId_targetEmployeeId_createdAt_idx";
DROP INDEX IF EXISTS public."Announcement_tenantId_locationId_createdAt_idx";
DROP INDEX IF EXISTS public."Announcement_tenantId_groupId_createdAt_idx";
DROP INDEX IF EXISTS public."Announcement_tenantId_departmentId_createdAt_idx";
DROP INDEX IF EXISTS public."Announcement_tenantId_audience_createdAt_idx";
DROP INDEX IF EXISTS public."AnnouncementTemplate_tenantId_targetEmployeeId_isActive_cre_idx";
DROP INDEX IF EXISTS public."AnnouncementTemplate_tenantId_managerEmployeeId_isActive_cr_idx";
DROP INDEX IF EXISTS public."AnnouncementTemplate_tenantId_locationId_isActive_createdAt_idx";
DROP INDEX IF EXISTS public."AnnouncementTemplate_tenantId_groupId_isActive_createdAt_idx";
DROP INDEX IF EXISTS public."AnnouncementTemplate_tenantId_departmentId_isActive_created_idx";
ALTER TABLE IF EXISTS ONLY public."WorkGroup" DROP CONSTRAINT IF EXISTS "WorkGroup_pkey";
ALTER TABLE IF EXISTS ONLY public."WorkGroupMembership" DROP CONSTRAINT IF EXISTS "WorkGroupMembership_pkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."UserRole" DROP CONSTRAINT IF EXISTS "UserRole_pkey";
ALTER TABLE IF EXISTS ONLY public."Tenant" DROP CONSTRAINT IF EXISTS "Tenant_pkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_pkey";
ALTER TABLE IF EXISTS ONLY public."TaskTemplate" DROP CONSTRAINT IF EXISTS "TaskTemplate_pkey";
ALTER TABLE IF EXISTS ONLY public."TaskPhotoProof" DROP CONSTRAINT IF EXISTS "TaskPhotoProof_pkey";
ALTER TABLE IF EXISTS ONLY public."TaskCompletion" DROP CONSTRAINT IF EXISTS "TaskCompletion_pkey";
ALTER TABLE IF EXISTS ONLY public."TaskChecklistItem" DROP CONSTRAINT IF EXISTS "TaskChecklistItem_pkey";
ALTER TABLE IF EXISTS ONLY public."TaskAutomationPolicy" DROP CONSTRAINT IF EXISTS "TaskAutomationPolicy_pkey";
ALTER TABLE IF EXISTS ONLY public."TaskActivity" DROP CONSTRAINT IF EXISTS "TaskActivity_pkey";
ALTER TABLE IF EXISTS ONLY public."Shift" DROP CONSTRAINT IF EXISTS "Shift_pkey";
ALTER TABLE IF EXISTS ONLY public."ShiftTemplate" DROP CONSTRAINT IF EXISTS "ShiftTemplate_pkey";
ALTER TABLE IF EXISTS ONLY public."Session" DROP CONSTRAINT IF EXISTS "Session_pkey";
ALTER TABLE IF EXISTS ONLY public."Role" DROP CONSTRAINT IF EXISTS "Role_pkey";
ALTER TABLE IF EXISTS ONLY public."RequestComment" DROP CONSTRAINT IF EXISTS "RequestComment_pkey";
ALTER TABLE IF EXISTS ONLY public."RequestAttachment" DROP CONSTRAINT IF EXISTS "RequestAttachment_pkey";
ALTER TABLE IF EXISTS ONLY public."RequestApprovalStep" DROP CONSTRAINT IF EXISTS "RequestApprovalStep_pkey";
ALTER TABLE IF EXISTS ONLY public."PushDevice" DROP CONSTRAINT IF EXISTS "PushDevice_pkey";
ALTER TABLE IF EXISTS ONLY public."PushDelivery" DROP CONSTRAINT IF EXISTS "PushDelivery_pkey";
ALTER TABLE IF EXISTS ONLY public."Position" DROP CONSTRAINT IF EXISTS "Position_pkey";
ALTER TABLE IF EXISTS ONLY public."PayrollPolicy" DROP CONSTRAINT IF EXISTS "PayrollPolicy_pkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_pkey";
ALTER TABLE IF EXISTS ONLY public."Location" DROP CONSTRAINT IF EXISTS "Location_pkey";
ALTER TABLE IF EXISTS ONLY public."HolidayCalendarDay" DROP CONSTRAINT IF EXISTS "HolidayCalendarDay_pkey";
ALTER TABLE IF EXISTS ONLY public."ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_pkey";
ALTER TABLE IF EXISTS ONLY public."Employee" DROP CONSTRAINT IF EXISTS "Employee_pkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffTransaction" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffTransaction_pkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeTimeOffBalance" DROP CONSTRAINT IF EXISTS "EmployeeTimeOffBalance_pkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeRequest" DROP CONSTRAINT IF EXISTS "EmployeeRequest_pkey";
ALTER TABLE IF EXISTS ONLY public."EmployeeInvitation" DROP CONSTRAINT IF EXISTS "EmployeeInvitation_pkey";
ALTER TABLE IF EXISTS ONLY public."DiagnosticsSnapshot" DROP CONSTRAINT IF EXISTS "DiagnosticsSnapshot_pkey";
ALTER TABLE IF EXISTS ONLY public."DiagnosticsPolicy" DROP CONSTRAINT IF EXISTS "DiagnosticsPolicy_pkey";
ALTER TABLE IF EXISTS ONLY public."Device" DROP CONSTRAINT IF EXISTS "Device_pkey";
ALTER TABLE IF EXISTS ONLY public."Department" DROP CONSTRAINT IF EXISTS "Department_pkey";
ALTER TABLE IF EXISTS ONLY public."Company" DROP CONSTRAINT IF EXISTS "Company_pkey";
ALTER TABLE IF EXISTS ONLY public."ChatThread" DROP CONSTRAINT IF EXISTS "ChatThread_pkey";
ALTER TABLE IF EXISTS ONLY public."ChatParticipant" DROP CONSTRAINT IF EXISTS "ChatParticipant_pkey";
ALTER TABLE IF EXISTS ONLY public."ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_pkey";
ALTER TABLE IF EXISTS ONLY public."BiometricVerification" DROP CONSTRAINT IF EXISTS "BiometricVerification_pkey";
ALTER TABLE IF EXISTS ONLY public."BiometricProfile" DROP CONSTRAINT IF EXISTS "BiometricProfile_pkey";
ALTER TABLE IF EXISTS ONLY public."BiometricJob" DROP CONSTRAINT IF EXISTS "BiometricJob_pkey";
ALTER TABLE IF EXISTS ONLY public."BiometricArtifact" DROP CONSTRAINT IF EXISTS "BiometricArtifact_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_pkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceEvent" DROP CONSTRAINT IF EXISTS "AttendanceEvent_pkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionRequest" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionRequest_pkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceCorrectionComment" DROP CONSTRAINT IF EXISTS "AttendanceCorrectionComment_pkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceBreak" DROP CONSTRAINT IF EXISTS "AttendanceBreak_pkey";
ALTER TABLE IF EXISTS ONLY public."AttendanceAnomalyNotification" DROP CONSTRAINT IF EXISTS "AttendanceAnomalyNotification_pkey";
ALTER TABLE IF EXISTS ONLY public."ApprovalPolicy" DROP CONSTRAINT IF EXISTS "ApprovalPolicy_pkey";
ALTER TABLE IF EXISTS ONLY public."Announcement" DROP CONSTRAINT IF EXISTS "Announcement_pkey";
ALTER TABLE IF EXISTS ONLY public."AnnouncementTemplate" DROP CONSTRAINT IF EXISTS "AnnouncementTemplate_pkey";
DROP TABLE IF EXISTS public."WorkGroupMembership";
DROP TABLE IF EXISTS public."WorkGroup";
DROP TABLE IF EXISTS public."UserRole";
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."Tenant";
DROP TABLE IF EXISTS public."TaskTemplate";
DROP TABLE IF EXISTS public."TaskPhotoProof";
DROP TABLE IF EXISTS public."TaskCompletion";
DROP TABLE IF EXISTS public."TaskChecklistItem";
DROP TABLE IF EXISTS public."TaskAutomationPolicy";
DROP TABLE IF EXISTS public."TaskActivity";
DROP TABLE IF EXISTS public."Task";
DROP TABLE IF EXISTS public."ShiftTemplate";
DROP TABLE IF EXISTS public."Shift";
DROP TABLE IF EXISTS public."Session";
DROP TABLE IF EXISTS public."Role";
DROP TABLE IF EXISTS public."RequestComment";
DROP TABLE IF EXISTS public."RequestAttachment";
DROP TABLE IF EXISTS public."RequestApprovalStep";
DROP TABLE IF EXISTS public."PushDevice";
DROP TABLE IF EXISTS public."PushDelivery";
DROP TABLE IF EXISTS public."Position";
DROP TABLE IF EXISTS public."PayrollPolicy";
DROP TABLE IF EXISTS public."Notification";
DROP TABLE IF EXISTS public."Location";
DROP TABLE IF EXISTS public."HolidayCalendarDay";
DROP TABLE IF EXISTS public."ExportJob";
DROP TABLE IF EXISTS public."EmployeeTimeOffTransaction";
DROP TABLE IF EXISTS public."EmployeeTimeOffBalance";
DROP TABLE IF EXISTS public."EmployeeRequest";
DROP TABLE IF EXISTS public."EmployeeInvitation";
DROP TABLE IF EXISTS public."Employee";
DROP TABLE IF EXISTS public."DiagnosticsSnapshot";
DROP TABLE IF EXISTS public."DiagnosticsPolicy";
DROP TABLE IF EXISTS public."Device";
DROP TABLE IF EXISTS public."Department";
DROP TABLE IF EXISTS public."Company";
DROP TABLE IF EXISTS public."ChatThread";
DROP TABLE IF EXISTS public."ChatParticipant";
DROP TABLE IF EXISTS public."ChatMessage";
DROP TABLE IF EXISTS public."BiometricVerification";
DROP TABLE IF EXISTS public."BiometricProfile";
DROP TABLE IF EXISTS public."BiometricJob";
DROP TABLE IF EXISTS public."BiometricArtifact";
DROP TABLE IF EXISTS public."AuditLog";
DROP TABLE IF EXISTS public."AttendanceSession";
DROP TABLE IF EXISTS public."AttendanceEvent";
DROP TABLE IF EXISTS public."AttendanceCorrectionRequest";
DROP TABLE IF EXISTS public."AttendanceCorrectionComment";
DROP TABLE IF EXISTS public."AttendanceBreak";
DROP TABLE IF EXISTS public."AttendanceAnomalyNotification";
DROP TABLE IF EXISTS public."ApprovalPolicy";
DROP TABLE IF EXISTS public."AnnouncementTemplate";
DROP TABLE IF EXISTS public."Announcement";
DROP TYPE IF EXISTS public."UserStatus";
DROP TYPE IF EXISTS public."TimeOffTransactionType";
DROP TYPE IF EXISTS public."TimeOffBalanceKind";
DROP TYPE IF EXISTS public."TaskTemplateFrequency";
DROP TYPE IF EXISTS public."TaskStatus";
DROP TYPE IF EXISTS public."TaskPriority";
DROP TYPE IF EXISTS public."TaskActivityKind";
DROP TYPE IF EXISTS public."ShiftStatus";
DROP TYPE IF EXISTS public."RequestType";
DROP TYPE IF EXISTS public."RequestStatus";
DROP TYPE IF EXISTS public."PushReceiptStatus";
DROP TYPE IF EXISTS public."PushProvider";
DROP TYPE IF EXISTS public."PushDeliveryStatus";
DROP TYPE IF EXISTS public."NotificationType";
DROP TYPE IF EXISTS public."ExportJobType";
DROP TYPE IF EXISTS public."ExportJobStatus";
DROP TYPE IF EXISTS public."EmployeeStatus";
DROP TYPE IF EXISTS public."EmployeeInvitationStatus";
DROP TYPE IF EXISTS public."DevicePlatform";
DROP TYPE IF EXISTS public."ChatThreadKind";
DROP TYPE IF EXISTS public."BiometricVerificationResult";
DROP TYPE IF EXISTS public."BiometricManualReviewStatus";
DROP TYPE IF EXISTS public."BiometricJobType";
DROP TYPE IF EXISTS public."BiometricJobStatus";
DROP TYPE IF EXISTS public."BiometricEnrollmentStatus";
DROP TYPE IF EXISTS public."BiometricArtifactKind";
DROP TYPE IF EXISTS public."AttendanceSessionStatus";
DROP TYPE IF EXISTS public."AttendanceResult";
DROP TYPE IF EXISTS public."AttendanceEventType";
DROP TYPE IF EXISTS public."AttendanceCorrectionStatus";
DROP TYPE IF EXISTS public."ApprovalStatus";
DROP TYPE IF EXISTS public."AnnouncementTemplateFrequency";
DROP TYPE IF EXISTS public."AnnouncementAudience";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: AnnouncementAudience; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AnnouncementAudience" AS ENUM (
    'ALL',
    'GROUP',
    'EMPLOYEE',
    'DEPARTMENT',
    'LOCATION'
);


--
-- Name: AnnouncementTemplateFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AnnouncementTemplateFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY'
);


--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SKIPPED'
);


--
-- Name: AttendanceCorrectionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceCorrectionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: AttendanceEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceEventType" AS ENUM (
    'CHECK_IN',
    'CHECK_OUT',
    'BREAK_START',
    'BREAK_END'
);


--
-- Name: AttendanceResult; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceResult" AS ENUM (
    'ACCEPTED',
    'REJECTED'
);


--
-- Name: AttendanceSessionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceSessionStatus" AS ENUM (
    'OPEN',
    'ON_BREAK',
    'CLOSED'
);


--
-- Name: BiometricArtifactKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BiometricArtifactKind" AS ENUM (
    'ENROLLMENT',
    'VERIFICATION'
);


--
-- Name: BiometricEnrollmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BiometricEnrollmentStatus" AS ENUM (
    'NOT_STARTED',
    'PENDING',
    'ENROLLED',
    'FAILED'
);


--
-- Name: BiometricJobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BiometricJobStatus" AS ENUM (
    'QUEUED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: BiometricJobType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BiometricJobType" AS ENUM (
    'VERIFY'
);


--
-- Name: BiometricManualReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BiometricManualReviewStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: BiometricVerificationResult; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BiometricVerificationResult" AS ENUM (
    'PASSED',
    'FAILED',
    'REVIEW'
);


--
-- Name: ChatThreadKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChatThreadKind" AS ENUM (
    'DIRECT',
    'GROUP'
);


--
-- Name: DevicePlatform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DevicePlatform" AS ENUM (
    'IOS',
    'ANDROID',
    'WEB'
);


--
-- Name: EmployeeInvitationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmployeeInvitationStatus" AS ENUM (
    'INVITED',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'EXPIRED'
);


--
-- Name: EmployeeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmployeeStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'TERMINATED'
);


--
-- Name: ExportJobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExportJobStatus" AS ENUM (
    'QUEUED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: ExportJobType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExportJobType" AS ENUM (
    'ATTENDANCE_HISTORY',
    'PAYROLL_SUMMARY'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'REQUEST_ACTION_REQUIRED',
    'REQUEST_APPROVED',
    'REQUEST_REJECTED',
    'EMPLOYEE_APPROVAL_ACTION_REQUIRED',
    'EMPLOYEE_APPROVED',
    'EMPLOYEE_REJECTED',
    'BIOMETRIC_REVIEW_ACTION_REQUIRED',
    'BIOMETRIC_REVIEW_APPROVED',
    'BIOMETRIC_REVIEW_REJECTED',
    'ATTENDANCE_CORRECTION_ACTION_REQUIRED',
    'ATTENDANCE_CORRECTION_APPROVED',
    'ATTENDANCE_CORRECTION_REJECTED',
    'ATTENDANCE_ANOMALY_CRITICAL',
    'OPERATIONS_ALERT',
    'DAILY_DIGEST'
);


--
-- Name: PushDeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PushDeliveryStatus" AS ENUM (
    'QUEUED',
    'PROCESSING',
    'DELIVERED',
    'FAILED'
);


--
-- Name: PushProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PushProvider" AS ENUM (
    'EXPO'
);


--
-- Name: PushReceiptStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PushReceiptStatus" AS ENUM (
    'PENDING',
    'OK',
    'ERROR'
);


--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: RequestType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestType" AS ENUM (
    'LEAVE',
    'SICK_LEAVE',
    'VACATION_CHANGE',
    'UNPAID_LEAVE',
    'SHIFT_CHANGE',
    'ADVANCE',
    'SUPPLY',
    'GENERAL'
);


--
-- Name: ShiftStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShiftStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: TaskActivityKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskActivityKind" AS ENUM (
    'CREATED',
    'COMMENT',
    'STATUS_CHANGED',
    'CHECKLIST_TOGGLED'
);


--
-- Name: TaskPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'DONE',
    'CANCELLED'
);


--
-- Name: TaskTemplateFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskTemplateFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY'
);


--
-- Name: TimeOffBalanceKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TimeOffBalanceKind" AS ENUM (
    'VACATION',
    'PERSONAL_DAY_OFF'
);


--
-- Name: TimeOffTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TimeOffTransactionType" AS ENUM (
    'SET',
    'ADJUST',
    'ACCRUAL',
    'RESERVED',
    'RELEASED',
    'CONSUMED'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'INVITED',
    'ACTIVE',
    'SUSPENDED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "authorEmployeeId" text NOT NULL,
    audience public."AnnouncementAudience" NOT NULL,
    "groupId" text,
    "targetEmployeeId" text,
    "departmentId" text,
    "locationId" text,
    title text NOT NULL,
    body text NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AnnouncementTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AnnouncementTemplate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "managerEmployeeId" text NOT NULL,
    audience public."AnnouncementAudience" NOT NULL,
    "groupId" text,
    "targetEmployeeId" text,
    "departmentId" text,
    "locationId" text,
    title text NOT NULL,
    body text NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    frequency public."AnnouncementTemplateFrequency" NOT NULL,
    "weekDaysJson" text,
    "dayOfMonth" integer,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "publishTimeLocal" text,
    "lastPublishedAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ApprovalPolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApprovalPolicy" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "requestType" public."RequestType",
    "departmentId" text,
    "locationId" text,
    "approverEmployeeId" text NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AttendanceAnomalyNotification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceAnomalyNotification" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "anomalyKey" text NOT NULL,
    type text NOT NULL,
    severity text NOT NULL,
    "employeeId" text,
    "notifiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AttendanceBreak; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceBreak" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "sessionId" text NOT NULL,
    "startEventId" text NOT NULL,
    "endEventId" text,
    "isPaid" boolean DEFAULT false NOT NULL,
    "startedAt" timestamp(3) without time zone NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "totalMinutes" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AttendanceCorrectionComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceCorrectionComment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "correctionRequestId" text NOT NULL,
    "authorEmployeeId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AttendanceCorrectionRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceCorrectionRequest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "sessionId" text NOT NULL,
    "employeeId" text NOT NULL,
    "requestedByEmployeeId" text NOT NULL,
    "approverEmployeeId" text NOT NULL,
    status public."AttendanceCorrectionStatus" DEFAULT 'PENDING'::public."AttendanceCorrectionStatus" NOT NULL,
    reason text NOT NULL,
    "proposedStartedAt" timestamp(3) without time zone,
    "proposedEndedAt" timestamp(3) without time zone,
    "proposedBreakMinutes" integer,
    "proposedPaidBreakMinutes" integer,
    "decisionComment" text,
    "finalDecisionAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AttendanceEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "eventType" public."AttendanceEventType" NOT NULL,
    result public."AttendanceResult" DEFAULT 'ACCEPTED'::public."AttendanceResult" NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "serverRecordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    "accuracyMeters" double precision NOT NULL,
    "distanceMeters" double precision NOT NULL,
    notes text,
    "locationId" text NOT NULL,
    "deviceId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AttendanceSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "shiftId" text,
    "checkInEventId" text NOT NULL,
    "checkOutEventId" text,
    status public."AttendanceSessionStatus" DEFAULT 'OPEN'::public."AttendanceSessionStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "totalMinutes" integer DEFAULT 0 NOT NULL,
    "lateMinutes" integer DEFAULT 0 NOT NULL,
    "earlyLeaveMinutes" integer DEFAULT 0 NOT NULL,
    "breakMinutes" integer DEFAULT 0 NOT NULL,
    "paidBreakMinutes" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "actorUserId" text,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    action text NOT NULL,
    "metadataJson" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BiometricArtifact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiometricArtifact" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "verificationId" text,
    kind public."BiometricArtifactKind" NOT NULL,
    "storageKey" text NOT NULL,
    "stepId" text,
    "contentType" text DEFAULT 'image/jpeg'::text NOT NULL,
    "captureMetadataJson" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BiometricJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiometricJob" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    type public."BiometricJobType" NOT NULL,
    status public."BiometricJobStatus" DEFAULT 'QUEUED'::public."BiometricJobStatus" NOT NULL,
    "payloadJson" text,
    "resultJson" text,
    "errorMessage" text,
    attempts integer DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BiometricProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiometricProfile" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "enrollmentStatus" public."BiometricEnrollmentStatus" DEFAULT 'NOT_STARTED'::public."BiometricEnrollmentStatus" NOT NULL,
    "consentVersion" text,
    "consentedAt" timestamp(3) without time zone,
    "templateRef" text,
    "enrolledAt" timestamp(3) without time zone,
    "lastVerifiedAt" timestamp(3) without time zone,
    provider text DEFAULT 'internal-placeholder'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BiometricVerification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BiometricVerification" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "attendanceEventId" text,
    result public."BiometricVerificationResult" NOT NULL,
    "manualReviewStatus" public."BiometricManualReviewStatus",
    "reviewerEmployeeId" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewerComment" text,
    "livenessScore" double precision,
    "matchScore" double precision,
    "reviewReason" text,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    provider text DEFAULT 'internal-placeholder'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "threadId" text NOT NULL,
    "authorEmployeeId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ChatParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatParticipant" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "threadId" text NOT NULL,
    "employeeId" text NOT NULL,
    "lastReadAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ChatThread; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatThread" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "createdByEmployeeId" text NOT NULL,
    kind public."ChatThreadKind" NOT NULL,
    title text,
    "groupId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Company; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "logoUrl" text,
    "googlePlaceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "parentDepartmentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Device; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Device" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    platform public."DevicePlatform" NOT NULL,
    "deviceFingerprint" text NOT NULL,
    "deviceName" text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DiagnosticsPolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DiagnosticsPolicy" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "exportQueueWarningMinutes" integer DEFAULT 10 NOT NULL,
    "exportQueueCriticalMinutes" integer DEFAULT 20 NOT NULL,
    "biometricQueueWarningMinutes" integer DEFAULT 10 NOT NULL,
    "biometricQueueCriticalMinutes" integer DEFAULT 20 NOT NULL,
    "exportFailureWarningCount24h" integer DEFAULT 1 NOT NULL,
    "biometricFailureWarningCount24h" integer DEFAULT 1 NOT NULL,
    "pushFailureCriticalCount24h" integer DEFAULT 1 NOT NULL,
    "pushReceiptErrorCriticalCount" integer DEFAULT 1 NOT NULL,
    "criticalAnomaliesCriticalCount" integer DEFAULT 1 NOT NULL,
    "pendingBiometricReviewWarningCount" integer DEFAULT 1 NOT NULL,
    "repeatIntervalMinutes" integer DEFAULT 60 NOT NULL,
    "notifyTenantOwner" boolean DEFAULT true NOT NULL,
    "notifyHrAdmin" boolean DEFAULT true NOT NULL,
    "notifyOperationsAdmin" boolean DEFAULT true NOT NULL,
    "notifyManagers" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DiagnosticsSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DiagnosticsSnapshot" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "exportQueued" integer DEFAULT 0 NOT NULL,
    "exportProcessing" integer DEFAULT 0 NOT NULL,
    "exportFailed" integer DEFAULT 0 NOT NULL,
    "exportCompleted" integer DEFAULT 0 NOT NULL,
    "exportOldestQueuedMinutes" integer DEFAULT 0 NOT NULL,
    "biometricQueued" integer DEFAULT 0 NOT NULL,
    "biometricProcessing" integer DEFAULT 0 NOT NULL,
    "biometricFailed" integer DEFAULT 0 NOT NULL,
    "biometricCompleted" integer DEFAULT 0 NOT NULL,
    "biometricOldestQueuedMinutes" integer DEFAULT 0 NOT NULL,
    "pushQueued" integer DEFAULT 0 NOT NULL,
    "pushProcessing" integer DEFAULT 0 NOT NULL,
    "pushFailed" integer DEFAULT 0 NOT NULL,
    "pushDelivered" integer DEFAULT 0 NOT NULL,
    "pushPendingReceipts" integer DEFAULT 0 NOT NULL,
    "pushReceiptErrors" integer DEFAULT 0 NOT NULL,
    "criticalAnomaliesToday" integer DEFAULT 0 NOT NULL,
    "pendingBiometricReviews" integer DEFAULT 0 NOT NULL,
    "exportFailures24h" integer DEFAULT 0 NOT NULL,
    "biometricFailures24h" integer DEFAULT 0 NOT NULL,
    "pushFailures24h" integer DEFAULT 0 NOT NULL,
    "criticalAlerts" integer DEFAULT 0 NOT NULL,
    "warningAlerts" integer DEFAULT 0 NOT NULL,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Employee" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    "companyId" text NOT NULL,
    "departmentId" text NOT NULL,
    "primaryLocationId" text NOT NULL,
    "positionId" text NOT NULL,
    "managerEmployeeId" text,
    "employeeNumber" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "middleName" text,
    "birthDate" timestamp(3) without time zone,
    gender text,
    phone text,
    "avatarStorageKey" text,
    "avatarUrl" text,
    status public."EmployeeStatus" DEFAULT 'ACTIVE'::public."EmployeeStatus" NOT NULL,
    "hireDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeInvitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeInvitation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "companyId" text,
    email text NOT NULL,
    "invitedByUserId" text NOT NULL,
    "userId" text,
    "approvedByUserId" text,
    "employeeId" text,
    "approvedShiftTemplateId" text,
    "approvedGroupId" text,
    status public."EmployeeInvitationStatus" DEFAULT 'INVITED'::public."EmployeeInvitationStatus" NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "invitedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resentCount" integer DEFAULT 0 NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "firstName" text,
    "lastName" text,
    "middleName" text,
    "birthDate" timestamp(3) without time zone,
    gender text,
    phone text,
    "avatarStorageKey" text,
    "avatarUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeRequest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "managerEmployeeId" text,
    "relatedRequestId" text,
    "requestType" public."RequestType" NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    title text NOT NULL,
    reason text,
    "startsOn" timestamp(3) without time zone NOT NULL,
    "endsOn" timestamp(3) without time zone NOT NULL,
    "requestedDays" integer NOT NULL,
    "requestContextJson" text,
    "currentStep" integer DEFAULT 1 NOT NULL,
    "finalDecisionAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeTimeOffBalance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeTimeOffBalance" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    kind public."TimeOffBalanceKind" NOT NULL,
    "allowanceDays" double precision DEFAULT 0 NOT NULL,
    "usedDays" double precision DEFAULT 0 NOT NULL,
    "pendingDays" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeTimeOffTransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeTimeOffTransaction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "balanceId" text NOT NULL,
    kind public."TimeOffBalanceKind" NOT NULL,
    type public."TimeOffTransactionType" NOT NULL,
    "deltaDays" double precision NOT NULL,
    "balanceAfterAllowanceDays" double precision NOT NULL,
    "balanceAfterUsedDays" double precision NOT NULL,
    "balanceAfterPendingDays" double precision NOT NULL,
    note text,
    "requestId" text,
    "actorUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ExportJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExportJob" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "requestedByUserId" text NOT NULL,
    type public."ExportJobType" NOT NULL,
    format text NOT NULL,
    status public."ExportJobStatus" DEFAULT 'QUEUED'::public."ExportJobStatus" NOT NULL,
    "parametersJson" text,
    "storageKey" text,
    "fileName" text,
    "contentType" text,
    "errorMessage" text,
    attempts integer DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HolidayCalendarDay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HolidayCalendarDay" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "isPaid" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Location" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "companyId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    "geofenceRadiusMeters" integer DEFAULT 100 NOT NULL,
    timezone text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    body text,
    "actionUrl" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "metadataJson" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PayrollPolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PayrollPolicy" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "baseHourlyRate" double precision DEFAULT 10 NOT NULL,
    "overtimeMultiplier" double precision DEFAULT 1.5 NOT NULL,
    "weekendMultiplier" double precision DEFAULT 2 NOT NULL,
    "weekendOvertimeMultiplier" double precision DEFAULT 2.5 NOT NULL,
    "holidayMultiplier" double precision DEFAULT 2 NOT NULL,
    "holidayOvertimeMultiplier" double precision DEFAULT 3 NOT NULL,
    "nightPremiumMultiplier" double precision DEFAULT 0.2 NOT NULL,
    "nightShiftStartLocal" text DEFAULT '22:00'::text NOT NULL,
    "nightShiftEndLocal" text DEFAULT '06:00'::text NOT NULL,
    "latenessPenaltyPerMinute" double precision DEFAULT 0 NOT NULL,
    "earlyLeavePenaltyPerMinute" double precision DEFAULT 0 NOT NULL,
    "leavePaidRatio" double precision DEFAULT 1 NOT NULL,
    "sickLeavePaidRatio" double precision DEFAULT 0.8 NOT NULL,
    "standardShiftMinutes" integer DEFAULT 480 NOT NULL,
    "defaultBreakIsPaid" boolean DEFAULT false NOT NULL,
    "maxBreakMinutes" integer DEFAULT 60 NOT NULL,
    "mandatoryBreakThresholdMinutes" integer DEFAULT 360 NOT NULL,
    "mandatoryBreakDurationMinutes" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Position; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Position" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PushDelivery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PushDelivery" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    "notificationId" text,
    provider public."PushProvider" DEFAULT 'EXPO'::public."PushProvider" NOT NULL,
    status public."PushDeliveryStatus" DEFAULT 'QUEUED'::public."PushDeliveryStatus" NOT NULL,
    title text NOT NULL,
    body text,
    "payloadJson" text,
    "ticketsJson" text,
    "receiptStatus" public."PushReceiptStatus",
    "receiptsJson" text,
    "receiptsCheckedAt" timestamp(3) without time zone,
    "errorMessage" text,
    attempts integer DEFAULT 0 NOT NULL,
    "deliveredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PushDevice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PushDevice" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    provider public."PushProvider" DEFAULT 'EXPO'::public."PushProvider" NOT NULL,
    platform public."DevicePlatform" NOT NULL,
    token text NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "lastRegisteredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RequestApprovalStep; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RequestApprovalStep" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "requestId" text NOT NULL,
    "approverEmployeeId" text NOT NULL,
    sequence integer NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    comment text,
    "actedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RequestAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RequestAttachment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "requestId" text NOT NULL,
    "uploadedByEmployeeId" text NOT NULL,
    "fileName" text NOT NULL,
    "contentType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "storageKey" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RequestComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RequestComment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "requestId" text NOT NULL,
    "authorEmployeeId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "refreshTokenHash" text NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Shift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Shift" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "templateId" text NOT NULL,
    "employeeId" text NOT NULL,
    "locationId" text NOT NULL,
    "positionId" text NOT NULL,
    "shiftDate" timestamp(3) without time zone NOT NULL,
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    status public."ShiftStatus" DEFAULT 'PUBLISHED'::public."ShiftStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ShiftTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShiftTemplate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "locationId" text NOT NULL,
    "positionId" text NOT NULL,
    "startsAtLocal" text NOT NULL,
    "endsAtLocal" text NOT NULL,
    "weekDaysJson" text,
    "gracePeriodMinutes" integer DEFAULT 10 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Task" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "managerEmployeeId" text NOT NULL,
    "assigneeEmployeeId" text,
    "groupId" text,
    title text NOT NULL,
    description text,
    status public."TaskStatus" DEFAULT 'TODO'::public."TaskStatus" NOT NULL,
    priority public."TaskPriority" DEFAULT 'MEDIUM'::public."TaskPriority" NOT NULL,
    "requiresPhoto" boolean DEFAULT false NOT NULL,
    "dueAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "lastReminderAt" timestamp(3) without time zone,
    "lastEscalatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TaskActivity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskActivity" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "taskId" text NOT NULL,
    "actorEmployeeId" text NOT NULL,
    kind public."TaskActivityKind" NOT NULL,
    body text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TaskAutomationPolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskAutomationPolicy" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "reminderLeadDays" integer DEFAULT 2 NOT NULL,
    "reminderRepeatHours" integer DEFAULT 24 NOT NULL,
    "escalationDelayDays" integer DEFAULT 1 NOT NULL,
    "escalateToManager" boolean DEFAULT true NOT NULL,
    "notifyAssignee" boolean DEFAULT true NOT NULL,
    "sendChatMessages" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TaskChecklistItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskChecklistItem" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "taskId" text NOT NULL,
    title text NOT NULL,
    "sortOrder" integer NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "completedByEmployeeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TaskCompletion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskCompletion" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "taskTemplateId" text NOT NULL,
    "assigneeEmployeeId" text NOT NULL,
    "occurrenceDate" timestamp(3) without time zone NOT NULL,
    status public."TaskStatus" DEFAULT 'TODO'::public."TaskStatus" NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TaskPhotoProof; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskPhotoProof" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "taskId" text,
    "taskCompletionId" text,
    "uploadedByEmployeeId" text NOT NULL,
    "fileName" text NOT NULL,
    "storageKey" text NOT NULL,
    "supersededByProofId" text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TaskTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskTemplate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "managerEmployeeId" text NOT NULL,
    "assigneeEmployeeId" text,
    "groupId" text,
    "departmentId" text,
    "locationId" text,
    title text NOT NULL,
    description text,
    priority public."TaskPriority" DEFAULT 'MEDIUM'::public."TaskPriority" NOT NULL,
    "requiresPhoto" boolean DEFAULT false NOT NULL,
    "expandOnDemand" boolean DEFAULT false NOT NULL,
    frequency public."TaskTemplateFrequency" NOT NULL,
    "weekDaysJson" text,
    "dayOfMonth" integer,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "dueAfterDays" integer DEFAULT 0 NOT NULL,
    "dueTimeLocal" text,
    "checklistJson" text,
    "lastGeneratedAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    status public."UserStatus" DEFAULT 'INVITED'::public."UserStatus" NOT NULL,
    "workspaceAccessAllowed" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRole" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleId" text NOT NULL,
    "scopeType" text NOT NULL,
    "scopeId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WorkGroup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkGroup" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "managerEmployeeId" text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WorkGroupMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkGroupMembership" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "groupId" text NOT NULL,
    "employeeId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Announcement" (id, "tenantId", "authorEmployeeId", audience, "groupId", "targetEmployeeId", "departmentId", "locationId", title, body, "isPinned", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AnnouncementTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnnouncementTemplate" (id, "tenantId", "managerEmployeeId", audience, "groupId", "targetEmployeeId", "departmentId", "locationId", title, body, "isPinned", frequency, "weekDaysJson", "dayOfMonth", "startDate", "endDate", "publishTimeLocal", "lastPublishedAt", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ApprovalPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApprovalPolicy" (id, "tenantId", "requestType", "departmentId", "locationId", "approverEmployeeId", priority, "createdAt", "updatedAt") FROM stdin;
c1737ed3-3d1a-4303-8f5b-80fd8ec02085-leave-owner	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	LEAVE	\N	\N	810a7883-40a2-49d8-9d5d-01591f65da75	1	2026-03-26 05:36:06.726	2026-03-26 05:36:06.726
c1737ed3-3d1a-4303-8f5b-80fd8ec02085-sick-owner	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	SICK_LEAVE	\N	\N	810a7883-40a2-49d8-9d5d-01591f65da75	1	2026-03-26 05:36:07.179	2026-03-26 05:36:07.179
\.


--
-- Data for Name: AttendanceAnomalyNotification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceAnomalyNotification" (id, "tenantId", "anomalyKey", type, severity, "employeeId", "notifiedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: AttendanceBreak; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceBreak" (id, "tenantId", "employeeId", "sessionId", "startEventId", "endEventId", "isPaid", "startedAt", "endedAt", "totalMinutes", "createdAt", "updatedAt") FROM stdin;
356f74d9-bf3f-4268-8798-2a8cc2f00ff8	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	87e17e40-e1cd-48c7-b400-cedeaffdd522	30af6080-bcf2-44c4-94e9-48c98770f0e1	5b37e608-2175-4789-944f-d1eb483bd22c	\N	f	2026-03-26 03:36:14.946	\N	0	2026-03-26 05:36:15.717	2026-03-26 05:36:15.717
\.


--
-- Data for Name: AttendanceCorrectionComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceCorrectionComment" (id, "tenantId", "correctionRequestId", "authorEmployeeId", body, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AttendanceCorrectionRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceCorrectionRequest" (id, "tenantId", "sessionId", "employeeId", "requestedByEmployeeId", "approverEmployeeId", status, reason, "proposedStartedAt", "proposedEndedAt", "proposedBreakMinutes", "proposedPaidBreakMinutes", "decisionComment", "finalDecisionAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AttendanceEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceEvent" (id, "tenantId", "employeeId", "eventType", result, "occurredAt", "serverRecordedAt", latitude, longitude, "accuracyMeters", "distanceMeters", notes, "locationId", "deviceId", "createdAt") FROM stdin;
124c9858-4228-4871-8b8c-f5b40a54fa27	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	87e17e40-e1cd-48c7-b400-cedeaffdd522	CHECK_IN	ACCEPTED	2026-03-26 01:36:14.499	2026-03-26 05:36:14.5	55.0302	82.9204	6	10	Seeded break shift	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	7914c000-f8be-45aa-a9de-b6d02e417bf8	2026-03-26 05:36:14.5
5b37e608-2175-4789-944f-d1eb483bd22c	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	87e17e40-e1cd-48c7-b400-cedeaffdd522	BREAK_START	ACCEPTED	2026-03-26 03:36:14.946	2026-03-26 05:36:14.947	55.0302	82.9204	6	14	Seeded long break	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	7914c000-f8be-45aa-a9de-b6d02e417bf8	2026-03-26 05:36:14.947
bc1aa219-96f9-4d0a-a1cc-8a7b4ba0ef48	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	379400e2-eb6e-4286-9484-7709e503c27d	CHECK_IN	ACCEPTED	2026-03-25 23:36:16.167	2026-03-26 05:36:16.169	55.0302	82.9204	7	11	Seeded early leave	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	36e32073-e7a8-477f-b78f-186f6a0b13c7	2026-03-26 05:36:16.169
2d0fcb02-def7-460e-a6d3-eee73c819e06	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	379400e2-eb6e-4286-9484-7709e503c27d	CHECK_OUT	ACCEPTED	2026-03-26 03:36:16.394	2026-03-26 05:36:16.395	55.0302	82.9204	7	9	Seeded early leave	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	36e32073-e7a8-477f-b78f-186f6a0b13c7	2026-03-26 05:36:16.395
\.


--
-- Data for Name: AttendanceSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceSession" (id, "tenantId", "employeeId", "shiftId", "checkInEventId", "checkOutEventId", status, "startedAt", "endedAt", "totalMinutes", "lateMinutes", "earlyLeaveMinutes", "breakMinutes", "paidBreakMinutes", "createdAt", "updatedAt") FROM stdin;
30af6080-bcf2-44c4-94e9-48c98770f0e1	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	87e17e40-e1cd-48c7-b400-cedeaffdd522	e647dbf6-bd86-483f-88b2-405abbbe428e	124c9858-4228-4871-8b8c-f5b40a54fa27	\N	ON_BREAK	2026-03-26 01:36:14.499	\N	240	0	0	0	0	2026-03-26 05:36:15.196	2026-03-26 05:36:15.196
93accaa8-710a-4a43-8b9e-00991f37840c	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	379400e2-eb6e-4286-9484-7709e503c27d	ae2a3162-591c-4607-8d4e-e799bdd23f48	bc1aa219-96f9-4d0a-a1cc-8a7b4ba0ef48	2d0fcb02-def7-460e-a6d3-eee73c819e06	CLOSED	2026-03-25 23:36:16.167	2026-03-26 03:36:16.394	240	0	35	0	0	2026-03-26 05:36:16.624	2026-03-26 05:36:16.624
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "tenantId", "actorUserId", "entityType", "entityId", action, "metadataJson", "createdAt") FROM stdin;
\.


--
-- Data for Name: BiometricArtifact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiometricArtifact" (id, "tenantId", "employeeId", "verificationId", kind, "storageKey", "stepId", "contentType", "captureMetadataJson", "createdAt") FROM stdin;
\.


--
-- Data for Name: BiometricJob; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiometricJob" (id, "tenantId", "employeeId", type, status, "payloadJson", "resultJson", "errorMessage", attempts, "startedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BiometricProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiometricProfile" (id, "employeeId", "enrollmentStatus", "consentVersion", "consentedAt", "templateRef", "enrolledAt", "lastVerifiedAt", provider, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BiometricVerification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BiometricVerification" (id, "employeeId", "attendanceEventId", result, "manualReviewStatus", "reviewerEmployeeId", "reviewedAt", "reviewerComment", "livenessScore", "matchScore", "reviewReason", "capturedAt", provider, "createdAt") FROM stdin;
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ChatMessage" (id, "tenantId", "threadId", "authorEmployeeId", body, "createdAt") FROM stdin;
\.


--
-- Data for Name: ChatParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ChatParticipant" (id, "tenantId", "threadId", "employeeId", "lastReadAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ChatThread; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ChatThread" (id, "tenantId", "createdByEmployeeId", kind, title, "groupId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Company" (id, "tenantId", name, code, "logoUrl", "googlePlaceId", "createdAt", "updatedAt") FROM stdin;
29a60929-c1db-4ee6-bca9-d03c906efe44	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Beauty Life	BEAUTY-HQ	\N	\N	2026-03-26 05:35:44.346	2026-03-26 05:35:44.346
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Department" (id, "tenantId", name, code, "parentDepartmentId", "createdAt", "updatedAt") FROM stdin;
c74e4bed-c351-422c-85e0-9d39bae1e546	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Operations	OPS	\N	2026-03-26 05:35:44.798	2026-03-26 05:35:44.798
1c1490e8-9649-406d-b252-df2cd0c26598	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Front Desk	FRONT	\N	2026-03-26 05:35:46.624	2026-03-26 05:35:46.624
\.


--
-- Data for Name: Device; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Device" (id, "employeeId", platform, "deviceFingerprint", "deviceName", "isPrimary", "createdAt", "updatedAt") FROM stdin;
9200c2de-6b18-4763-a589-d3a354999c85	810a7883-40a2-49d8-9d5d-01591f65da75	WEB	demo-device-owner	Owner Browser	t	2026-03-26 05:35:55.289	2026-03-26 05:35:55.289
5916fd8c-bc91-4a54-bfed-f5cf0ae7ada3	39f120b3-3621-436b-9076-abea21b3d0fd	WEB	demo-device-alex	Alex Browser	t	2026-03-26 05:35:57.529	2026-03-26 05:35:57.529
8e315bb5-cf46-4e0b-838c-84371d8b9e30	747f0ba4-b74f-4ea6-ac07-36f2169e3ec7	WEB	demo-device-manager	Manager Browser	t	2026-03-26 05:35:59.316	2026-03-26 05:35:59.316
f774da2c-3165-4e31-820a-47874fc7e714	e78d3178-ce78-45c9-9b44-c68daf8746cd	WEB	demo-device-julia	Julia Browser	t	2026-03-26 05:36:01.103	2026-03-26 05:36:01.103
36e32073-e7a8-477f-b78f-186f6a0b13c7	379400e2-eb6e-4286-9484-7709e503c27d	WEB	demo-device-sergey	Sergey Browser	t	2026-03-26 05:36:02.918	2026-03-26 05:36:02.918
7914c000-f8be-45aa-a9de-b6d02e417bf8	87e17e40-e1cd-48c7-b400-cedeaffdd522	WEB	demo-device-maria	Maria Browser	t	2026-03-26 05:36:04.703	2026-03-26 05:36:04.703
\.


--
-- Data for Name: DiagnosticsPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DiagnosticsPolicy" (id, "tenantId", "exportQueueWarningMinutes", "exportQueueCriticalMinutes", "biometricQueueWarningMinutes", "biometricQueueCriticalMinutes", "exportFailureWarningCount24h", "biometricFailureWarningCount24h", "pushFailureCriticalCount24h", "pushReceiptErrorCriticalCount", "criticalAnomaliesCriticalCount", "pendingBiometricReviewWarningCount", "repeatIntervalMinutes", "notifyTenantOwner", "notifyHrAdmin", "notifyOperationsAdmin", "notifyManagers", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DiagnosticsSnapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DiagnosticsSnapshot" (id, "tenantId", "exportQueued", "exportProcessing", "exportFailed", "exportCompleted", "exportOldestQueuedMinutes", "biometricQueued", "biometricProcessing", "biometricFailed", "biometricCompleted", "biometricOldestQueuedMinutes", "pushQueued", "pushProcessing", "pushFailed", "pushDelivered", "pushPendingReceipts", "pushReceiptErrors", "criticalAnomaliesToday", "pendingBiometricReviews", "exportFailures24h", "biometricFailures24h", "pushFailures24h", "criticalAlerts", "warningAlerts", "capturedAt") FROM stdin;
\.


--
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Employee" (id, "tenantId", "userId", "companyId", "departmentId", "primaryLocationId", "positionId", "managerEmployeeId", "employeeNumber", "firstName", "lastName", "middleName", "birthDate", gender, phone, "avatarStorageKey", "avatarUrl", status, "hireDate", "createdAt", "updatedAt") FROM stdin;
810a7883-40a2-49d8-9d5d-01591f65da75	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	157a14e0-183d-419c-9f9b-810a51363473	29a60929-c1db-4ee6-bca9-d03c906efe44	c74e4bed-c351-422c-85e0-9d39bae1e546	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	3ec2b047-777a-4d7a-84a5-d266377920a5	\N	EMP-0001	Ilia	Admin	\N	1990-03-28 04:00:00	\N	\N	\N	\N	ACTIVE	2026-01-01 00:00:00	2026-03-26 05:35:54.605	2026-03-26 05:35:54.605
39f120b3-3621-436b-9076-abea21b3d0fd	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	8ee4d6f9-df74-467b-bd9d-8336bee94cfb	29a60929-c1db-4ee6-bca9-d03c906efe44	c74e4bed-c351-422c-85e0-9d39bae1e546	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	810a7883-40a2-49d8-9d5d-01591f65da75	EMP-0002	Alexander	Prokhorov	\N	1994-04-03 05:00:00	\N	\N	\N	\N	ACTIVE	2026-01-05 00:00:00	2026-03-26 05:35:57.076	2026-03-26 05:35:57.076
747f0ba4-b74f-4ea6-ac07-36f2169e3ec7	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	bb47848b-31a6-44b5-aa8e-d8c4fa75b8dd	29a60929-c1db-4ee6-bca9-d03c906efe44	c74e4bed-c351-422c-85e0-9d39bae1e546	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	70742bb1-abb9-4c89-8ee3-585ac1c2666f	810a7883-40a2-49d8-9d5d-01591f65da75	EMP-0006	Anna	Manager	\N	1992-04-07 04:00:00	\N	\N	\N	\N	ACTIVE	2026-01-09 00:00:00	2026-03-26 05:35:59.091	2026-03-26 05:35:59.091
e78d3178-ce78-45c9-9b44-c68daf8746cd	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	cb040e5a-76f7-45d3-901e-ca0d4108addc	29a60929-c1db-4ee6-bca9-d03c906efe44	1c1490e8-9649-406d-b252-df2cd0c26598	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	810a7883-40a2-49d8-9d5d-01591f65da75	EMP-0003	Julia	Zakharova	\N	1996-04-10 05:00:00	\N	\N	\N	\N	ACTIVE	2026-01-12 00:00:00	2026-03-26 05:36:00.877	2026-03-26 05:36:00.877
379400e2-eb6e-4286-9484-7709e503c27d	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	3bbd286e-e358-4685-b9e8-0cef4cd150d9	29a60929-c1db-4ee6-bca9-d03c906efe44	c74e4bed-c351-422c-85e0-9d39bae1e546	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	810a7883-40a2-49d8-9d5d-01591f65da75	EMP-0004	Sergey	Ivanov	\N	1991-04-23 05:00:00	\N	\N	\N	\N	ACTIVE	2026-01-20 00:00:00	2026-03-26 05:36:02.688	2026-03-26 05:36:02.688
87e17e40-e1cd-48c7-b400-cedeaffdd522	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	43d01af9-c2b4-4b14-b8fc-97b9110dd585	29a60929-c1db-4ee6-bca9-d03c906efe44	1c1490e8-9649-406d-b252-df2cd0c26598	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	810a7883-40a2-49d8-9d5d-01591f65da75	EMP-0005	Maria	Kim	\N	1993-05-06 04:00:00	\N	\N	\N	\N	ACTIVE	2026-02-01 00:00:00	2026-03-26 05:36:04.479	2026-03-26 05:36:04.479
\.


--
-- Data for Name: EmployeeInvitation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeInvitation" (id, "tenantId", "companyId", email, "invitedByUserId", "userId", "approvedByUserId", "employeeId", "approvedShiftTemplateId", "approvedGroupId", status, "tokenHash", "expiresAt", "invitedAt", "lastSentAt", "resentCount", "submittedAt", "approvedAt", "rejectedAt", "rejectedReason", "firstName", "lastName", "middleName", "birthDate", gender, phone, "avatarStorageKey", "avatarUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmployeeRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeRequest" (id, "tenantId", "employeeId", "managerEmployeeId", "relatedRequestId", "requestType", status, title, reason, "startsOn", "endsOn", "requestedDays", "requestContextJson", "currentStep", "finalDecisionAt", "createdAt", "updatedAt") FROM stdin;
ec37a0df-feaa-4528-8df9-f6023f22f16d	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	39f120b3-3621-436b-9076-abea21b3d0fd	810a7883-40a2-49d8-9d5d-01591f65da75	\N	SUPPLY	PENDING	Supply request for consumables	Need signed purchase package for gloves and salon supplies.	2026-03-26 05:36:26.25	2026-03-27 05:36:26.25	1	\N	1	\N	2026-03-26 05:36:26.252	2026-03-26 05:36:26.252
832f4272-11f3-4708-8bf8-67b0340399eb	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	e78d3178-ce78-45c9-9b44-c68daf8746cd	810a7883-40a2-49d8-9d5d-01591f65da75	\N	LEAVE	PENDING	Leave request for next week	Need approval for family travel from Monday to Wednesday.	2026-04-02 05:36:29.375	2026-04-04 05:36:29.375	3	\N	1	\N	2026-03-26 05:36:29.376	2026-03-26 05:36:29.376
\.


--
-- Data for Name: EmployeeTimeOffBalance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeTimeOffBalance" (id, "tenantId", "employeeId", kind, "allowanceDays", "usedDays", "pendingDays", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmployeeTimeOffTransaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeTimeOffTransaction" (id, "tenantId", "employeeId", "balanceId", kind, type, "deltaDays", "balanceAfterAllowanceDays", "balanceAfterUsedDays", "balanceAfterPendingDays", note, "requestId", "actorUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ExportJob; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExportJob" (id, "tenantId", "requestedByUserId", type, format, status, "parametersJson", "storageKey", "fileName", "contentType", "errorMessage", attempts, "startedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HolidayCalendarDay; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HolidayCalendarDay" (id, "tenantId", name, date, "isPaid", "createdAt", "updatedAt") FROM stdin;
6fd040e1-e771-4582-8172-f9f88bfdb1c8	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Women's Day	2026-03-08 00:00:00	t	2026-03-26 05:36:07.403	2026-03-26 05:36:07.403
\.


--
-- Data for Name: Location; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Location" (id, "tenantId", "companyId", name, code, address, latitude, longitude, "geofenceRadiusMeters", timezone, "createdAt", "updatedAt") FROM stdin;
1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	29a60929-c1db-4ee6-bca9-d03c906efe44	Central Studio	HQ	Demo address	55.0302	82.9204	120	Asia/Novosibirsk	2026-03-26 05:35:51.923	2026-03-26 05:35:51.923
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "tenantId", "userId", type, title, body, "actionUrl", "isRead", "readAt", "metadataJson", "createdAt", "updatedAt") FROM stdin;
4e677fc1-cdb0-4878-a224-16421de86936	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	157a14e0-183d-419c-9f9b-810a51363473	REQUEST_ACTION_REQUIRED	Action required: supply package	Alexander uploaded two files that need your sign-off.	/requests	f	\N	\N	2026-03-26 05:36:30.94	2026-03-26 05:36:30.94
a94782cf-85e0-464f-a698-a8d6dc6c0c32	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	157a14e0-183d-419c-9f9b-810a51363473	ATTENDANCE_ANOMALY_CRITICAL	Shift issue needs attention	Julia did not check in for the active shift after the grace period.	/attendance	f	\N	\N	2026-03-26 05:36:30.94	2026-03-26 05:36:30.94
c5a1d53c-47b4-4afe-aa62-b69823078b6e	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	157a14e0-183d-419c-9f9b-810a51363473	OPERATIONS_ALERT	Three approvals still waiting	Pending requests and document actions are still open on your side.	/requests	f	\N	\N	2026-03-26 05:36:30.94	2026-03-26 05:36:30.94
\.


--
-- Data for Name: PayrollPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollPolicy" (id, "tenantId", "baseHourlyRate", "overtimeMultiplier", "weekendMultiplier", "weekendOvertimeMultiplier", "holidayMultiplier", "holidayOvertimeMultiplier", "nightPremiumMultiplier", "nightShiftStartLocal", "nightShiftEndLocal", "latenessPenaltyPerMinute", "earlyLeavePenaltyPerMinute", "leavePaidRatio", "sickLeavePaidRatio", "standardShiftMinutes", "defaultBreakIsPaid", "maxBreakMinutes", "mandatoryBreakThresholdMinutes", "mandatoryBreakDurationMinutes", "createdAt", "updatedAt") FROM stdin;
20926110-b594-4d6f-a6f5-19fa35408abc	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	15	1.5	2	2.5	2	3	0.2	22:00	06:00	0.2	0.2	1	0.8	480	f	60	360	30	2026-03-26 05:36:04.927	2026-03-26 05:36:04.927
\.


--
-- Data for Name: Position; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Position" (id, "tenantId", name, code, "createdAt", "updatedAt") FROM stdin;
3ec2b047-777a-4d7a-84a5-d266377920a5	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Administrator	OWNER	2026-03-26 05:35:47.765	2026-03-26 05:35:47.765
9e450011-e865-4929-bb00-cf5203190371	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Specialist	SPEC	2026-03-26 05:35:49.57	2026-03-26 05:35:49.57
70742bb1-abb9-4c89-8ee3-585ac1c2666f	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Manager	MANAGER	2026-03-26 05:35:50.728	2026-03-26 05:35:50.728
\.


--
-- Data for Name: PushDelivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushDelivery" (id, "tenantId", "userId", "notificationId", provider, status, title, body, "payloadJson", "ticketsJson", "receiptStatus", "receiptsJson", "receiptsCheckedAt", "errorMessage", attempts, "deliveredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PushDevice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushDevice" (id, "tenantId", "userId", provider, platform, token, "isEnabled", "lastRegisteredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RequestApprovalStep; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RequestApprovalStep" (id, "tenantId", "requestId", "approverEmployeeId", sequence, status, comment, "actedAt", "createdAt", "updatedAt") FROM stdin;
9c098b1c-c856-40f2-bc3c-84dc66b9b5f9	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	ec37a0df-feaa-4528-8df9-f6023f22f16d	810a7883-40a2-49d8-9d5d-01591f65da75	1	PENDING	\N	\N	2026-03-26 05:36:26.252	2026-03-26 05:36:26.252
84cc08bc-2518-4e24-b707-6c28614ef616	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	832f4272-11f3-4708-8bf8-67b0340399eb	810a7883-40a2-49d8-9d5d-01591f65da75	1	PENDING	\N	\N	2026-03-26 05:36:29.376	2026-03-26 05:36:29.376
\.


--
-- Data for Name: RequestAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RequestAttachment" (id, "tenantId", "requestId", "uploadedByEmployeeId", "fileName", "contentType", "sizeBytes", "storageKey", "createdAt") FROM stdin;
2a57d98c-56e2-401b-87d6-e1d6bd88011e	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	ec37a0df-feaa-4528-8df9-f6023f22f16d	39f120b3-3621-436b-9076-abea21b3d0fd	consumables-pack.pdf	application/pdf	248000	requests/c1737ed3-3d1a-4303-8f5b-80fd8ec02085/supply/consumables-pack.pdf	2026-03-26 05:36:28.485
2c903696-c8d0-4c9d-8346-82e3c49d14d0	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	ec37a0df-feaa-4528-8df9-f6023f22f16d	39f120b3-3621-436b-9076-abea21b3d0fd	invoice-draft.pdf	application/pdf	196000	requests/c1737ed3-3d1a-4303-8f5b-80fd8ec02085/supply/invoice-draft.pdf	2026-03-26 05:36:28.485
\.


--
-- Data for Name: RequestComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RequestComment" (id, "tenantId", "requestId", "authorEmployeeId", body, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, code, name, description) FROM stdin;
61db378c-03ca-48e4-9b78-f0ba4e7ee80e	tenant_owner	Tenant Owner	Full company access
ff02c359-f7f5-464b-9a8c-045719871072	employee	Employee	Standard employee access
07cd8eba-b1f6-4ebe-a14a-a3e6e011e954	manager	Manager	Manager access for team operations
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "userId", "refreshTokenHash", "userAgent", "ipAddress", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Shift; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Shift" (id, "tenantId", "templateId", "employeeId", "locationId", "positionId", "shiftDate", "startsAt", "endsAt", status, "createdAt", "updatedAt") FROM stdin;
ae2d3981-936b-487a-9b53-2377e75049d8	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	65f19eb0-4c03-4d15-b32b-e185203c8f12	39f120b3-3621-436b-9076-abea21b3d0fd	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	2026-03-25 17:00:00	2026-03-26 02:00:00	2026-03-26 11:00:00	PUBLISHED	2026-03-26 05:36:12.486	2026-03-26 05:36:12.486
e647dbf6-bd86-483f-88b2-405abbbe428e	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	65f19eb0-4c03-4d15-b32b-e185203c8f12	87e17e40-e1cd-48c7-b400-cedeaffdd522	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	2026-03-25 17:00:00	2026-03-26 01:00:00	2026-03-26 10:00:00	PUBLISHED	2026-03-26 05:36:12.934	2026-03-26 05:36:12.934
ae2a3162-591c-4607-8d4e-e799bdd23f48	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	65f19eb0-4c03-4d15-b32b-e185203c8f12	379400e2-eb6e-4286-9484-7709e503c27d	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	2026-03-25 17:00:00	2026-03-26 00:30:00	2026-03-26 09:00:00	PUBLISHED	2026-03-26 05:36:13.158	2026-03-26 05:36:13.158
cd7d74ef-04e1-4a14-8361-19b3bd7bf7fc	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	65f19eb0-4c03-4d15-b32b-e185203c8f12	e78d3178-ce78-45c9-9b44-c68daf8746cd	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	2026-03-25 17:00:00	2026-03-26 03:00:00	2026-03-26 12:00:00	PUBLISHED	2026-03-26 05:36:13.385	2026-03-26 05:36:13.385
9eab859c-f9de-46e2-a0f1-619317ef11cb	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	991cde0c-a154-4d64-bec3-254a6c6681b2	810a7883-40a2-49d8-9d5d-01591f65da75	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	3ec2b047-777a-4d7a-84a5-d266377920a5	2026-03-25 17:00:00	2026-03-26 02:00:00	2026-03-26 11:00:00	PUBLISHED	2026-03-26 05:36:13.609	2026-03-26 05:36:13.609
6084dfd5-9103-49d3-ae51-f3b72069d6fb	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	727a21f0-365b-489d-877c-f651ff6e9440	39f120b3-3621-436b-9076-abea21b3d0fd	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	2026-03-26 17:00:00	2026-03-27 04:00:00	2026-03-27 13:00:00	PUBLISHED	2026-03-26 05:36:13.609	2026-03-26 05:36:13.609
8bce71c8-3f05-43e4-a62b-6598bc98c8b1	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	727a21f0-365b-489d-877c-f651ff6e9440	39f120b3-3621-436b-9076-abea21b3d0fd	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	2026-03-28 17:00:00	2026-03-29 05:00:00	2026-03-29 14:00:00	PUBLISHED	2026-03-26 05:36:13.609	2026-03-26 05:36:13.609
03c0fb83-fc2e-4740-bc1c-4ae9160f264b	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	727a21f0-365b-489d-877c-f651ff6e9440	39f120b3-3621-436b-9076-abea21b3d0fd	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	2026-03-31 17:00:00	2026-04-01 02:30:00	2026-04-01 11:30:00	PUBLISHED	2026-03-26 05:36:13.609	2026-03-26 05:36:13.609
dfb8e333-d081-4032-be3e-a0350387f0c2	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	991cde0c-a154-4d64-bec3-254a6c6681b2	810a7883-40a2-49d8-9d5d-01591f65da75	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	3ec2b047-777a-4d7a-84a5-d266377920a5	2026-03-27 17:00:00	2026-03-28 03:00:00	2026-03-28 12:00:00	PUBLISHED	2026-03-26 05:36:13.609	2026-03-26 05:36:13.609
ebfdf2ec-7042-48cc-bf16-60ffb67ebff6	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	991cde0c-a154-4d64-bec3-254a6c6681b2	810a7883-40a2-49d8-9d5d-01591f65da75	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	3ec2b047-777a-4d7a-84a5-d266377920a5	2026-03-29 17:00:00	2026-03-30 02:00:00	2026-03-30 10:30:00	PUBLISHED	2026-03-26 05:36:13.609	2026-03-26 05:36:13.609
5fd189bf-0fbf-49ba-a1d5-4904765e8235	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	991cde0c-a154-4d64-bec3-254a6c6681b2	810a7883-40a2-49d8-9d5d-01591f65da75	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	3ec2b047-777a-4d7a-84a5-d266377920a5	2026-04-01 17:00:00	2026-04-02 04:00:00	2026-04-02 12:00:00	PUBLISHED	2026-03-26 05:36:13.609	2026-03-26 05:36:13.609
\.


--
-- Data for Name: ShiftTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftTemplate" (id, "tenantId", name, code, "locationId", "positionId", "startsAtLocal", "endsAtLocal", "weekDaysJson", "gracePeriodMinutes", "createdAt", "updatedAt") FROM stdin;
65f19eb0-4c03-4d15-b32b-e185203c8f12	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Flexible Day Shift	DAY-FLEX	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	09:00	18:00	\N	10	2026-03-26 05:36:07.853	2026-03-26 05:36:07.853
727a21f0-365b-489d-877c-f651ff6e9440	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Demo Future Employee Shift	DEMO-FUTURE-EMP	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	9e450011-e865-4929-bb00-cf5203190371	11:00	20:00	\N	10	2026-03-26 05:36:08.303	2026-03-26 05:36:08.303
991cde0c-a154-4d64-bec3-254a6c6681b2	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Demo Future Owner Shift	DEMO-FUTURE-OWNER	1d768ce2-1d4d-42dd-bb0f-b7cef483a4d7	3ec2b047-777a-4d7a-84a5-d266377920a5	10:00	19:00	\N	10	2026-03-26 05:36:08.847	2026-03-26 05:36:08.847
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Task" (id, "tenantId", "managerEmployeeId", "assigneeEmployeeId", "groupId", title, description, status, priority, "requiresPhoto", "dueAt", "completedAt", "lastReminderAt", "lastEscalatedAt", "createdAt", "updatedAt") FROM stdin;
edbea8f5-74aa-4e6c-9e8b-9c004411e8d8	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Prepare two treatment rooms	Open room A and room B for the morning clients and verify that all surfaces are clean.	TODO	HIGH	f	2026-03-26 03:30:00	\N	\N	\N	2026-03-26 05:36:19.77	2026-03-26 05:36:19.77
b7f2fc45-8c2e-4732-a555-bc04132c3f78	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Restock towels and cleaning supplies	Refill the storage cart before the lunch rush so the evening shift does not run out of supplies.	TODO	URGENT	f	2026-03-26 05:15:00	\N	\N	\N	2026-03-26 05:36:21.552	2026-03-26 05:36:21.552
d816c1b4-5cc6-4444-a975-2798ffde2892	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Take before-service photos	Take two photos of the prepared rooms before the first service block starts.	TODO	MEDIUM	t	2026-03-26 06:40:00	\N	\N	\N	2026-03-26 05:36:22.892	2026-03-26 05:36:22.892
0422355a-0894-4059-b608-cb4b13045c15	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Meeting: front desk briefing	Short coordination before the afternoon bookings start.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Reception desk"}	TODO	MEDIUM	f	2026-03-26 07:30:00	\N	\N	\N	2026-03-26 05:36:23.343	2026-03-26 05:36:23.343
5188c568-02ef-4447-99b8-2e4ea8987e91	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Finish laundry cycle	Move washed towels to the drying rack and prepare the second batch.	DONE	HIGH	f	2026-03-26 04:00:00	\N	\N	\N	2026-03-26 05:36:23.567	2026-03-26 05:36:23.567
7a420e7d-3658-425d-a562-0638f62a7876	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: lobby walkthrough	Check the reception area, promo stand and entrance before the midday traffic starts.	TODO	MEDIUM	f	2026-03-26 04:15:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
fb40a86b-fb0d-4a04-b17f-5d8fb6af8afa	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: approve photo report from stock room	Review the latest stock room cleanup and attach your own confirming photo after the walkthrough.	TODO	HIGH	t	2026-03-26 06:10:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
a5bf8faa-b85a-42cb-8944-27ddf2d1d48d	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: quick sync with reception	Five-minute alignment on the guest flow before the afternoon block.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Reception desk"}	TODO	MEDIUM	f	2026-03-26 08:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
d2312695-94e8-4610-9ca8-0566c250f3dc	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: review next week staffing	Review open coverage for the next week and lock the Friday evening handoff.	TODO	HIGH	f	2026-03-27 09:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
d2ebcb06-6f03-4d6a-b4d8-7f296f2d2106	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: approve studio supply budget	Check forecasted расходники and approve the replenishment budget before the weekend.	TODO	URGENT	f	2026-03-29 06:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
a4fff117-5533-413b-9b73-ffa31fe1550b	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: 1:1 with Alexander	Short sync on workload, upcoming shifts and room readiness.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Owner office"}	TODO	MEDIUM	f	2026-03-30 08:30:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
39d33cac-b516-40d1-963f-afb1c4750ada	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: prep VIP room for tomorrow	Prepare the VIP room in advance and check oils, towels and lighting before close.	TODO	HIGH	f	2026-03-27 11:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
f7b78700-2984-4350-ab95-12c6ee8128ae	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: confirm weekend inventory count	Count remaining consumables and leave a short note if anything will run out by Sunday.	TODO	MEDIUM	f	2026-03-29 10:15:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
ab5b3a15-7b81-4300-a274-a0338a8ddf8b	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: training check-in with owner	15-minute sync to confirm the upcoming service flow updates.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Reception desk"}	TODO	MEDIUM	f	2026-04-01 07:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
53864f61-84b6-4580-8ca5-e00d2eb056fb	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: audit storage room photo report	Walk through the stock room, compare actual shelves with the expected layout and attach fresh photos for the weekly archive.	TODO	HIGH	t	2026-03-28 10:45:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
319c7234-e650-461f-8511-7280847eae5a	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: sign contractor extension	Review the renewal packet and finish the remaining notes before sending the final confirmation.	IN_PROGRESS	URGENT	f	2026-03-25 09:30:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
76ac5834-c9cf-4b1b-990e-8e65e8ce2a6a	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: weekly planning board review	Update the staffing board and flag any open evening coverage for the next seven days.	TODO	MEDIUM	f	2026-03-31 04:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
5ace2ca5-7d64-454f-acb0-cf896443ae78	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: online finance sync	Review payroll timing and upcoming supplier payments with finance.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"online","meetingLink":"https://meet.google.com/demo-owner-finance"}	TODO	HIGH	f	2026-03-28 05:30:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
299a4764-81bc-4984-9f14-f19704d54531	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	Owner: approve weekend promo setup	Check the lobby merchandising draft and confirm the final promo placement before Friday.	TODO	MEDIUM	f	2026-04-02 08:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
5616f213-0d53-4a01-889e-18bb4f93fe28	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: reception zone photo report	Before opening, capture the reception zone, promo stand and waiting area for the manager review.	TODO	HIGH	t	2026-03-27 02:20:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
97a229b9-0622-46ed-98f9-4cee7043afdc	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: deep clean coffee point	Wipe the machine, replace water, sort cups and leave the station guest-ready.	IN_PROGRESS	HIGH	f	2026-03-25 06:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
8b8accdd-0e58-4161-a6fa-d56bce699944	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: prepare retail shelf photos	Refresh the travel-size product shelf and upload two clean photos after rearranging the display.	TODO	MEDIUM	t	2026-03-29 12:00:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
3e320a10-9999-4716-a533-27966739f7af	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: online product training	Join the short vendor walkthrough and note the new product talking points.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"online","meetingLink":"https://zoom.us/j/555000222"}	TODO	MEDIUM	f	2026-03-30 03:30:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
fb336c8b-4ecc-451e-8bb4-df44a836bfc4	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: post-shift towel count	Count remaining clean towels after the evening shift and leave the result in the notes.	TODO	LOW	f	2026-03-31 13:15:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
bbac3fd2-6305-485a-bd82-1772fabe5d83	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	Employee: overdue dust check in studio A	This task intentionally stays overdue in the demo so the dashboard shows an attention case.	TODO	URGENT	f	2026-03-24 04:30:00	\N	\N	\N	2026-03-26 05:36:23.794	2026-03-26 05:36:23.794
\.


--
-- Data for Name: TaskActivity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskActivity" (id, "tenantId", "taskId", "actorEmployeeId", kind, body, "createdAt") FROM stdin;
\.


--
-- Data for Name: TaskAutomationPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskAutomationPolicy" (id, "tenantId", "reminderLeadDays", "reminderRepeatHours", "escalationDelayDays", "escalateToManager", "notifyAssignee", "sendChatMessages", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TaskChecklistItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskChecklistItem" (id, "tenantId", "taskId", title, "sortOrder", "isCompleted", "completedAt", "completedByEmployeeId", "createdAt", "updatedAt") FROM stdin;
5b99c928-478a-4958-9571-d8ad7ad56fea	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	edbea8f5-74aa-4e6c-9e8b-9c004411e8d8	Wipe both desks and mirrors	1	f	\N	\N	2026-03-26 05:36:19.77	2026-03-26 05:36:19.77
ac828984-6abb-486d-a9a3-8404744cd6ae	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	edbea8f5-74aa-4e6c-9e8b-9c004411e8d8	Set fresh towels in each room	2	f	\N	\N	2026-03-26 05:36:19.77	2026-03-26 05:36:19.77
ae68a260-18cc-4679-94bc-f11ab33ea4c3	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	b7f2fc45-8c2e-4732-a555-bc04132c3f78	Count clean towels	1	t	2026-03-26 04:10:00	39f120b3-3621-436b-9076-abea21b3d0fd	2026-03-26 05:36:21.552	2026-03-26 05:36:21.552
1aeb356f-5cd6-4ce2-836a-af9a3de9fb94	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	b7f2fc45-8c2e-4732-a555-bc04132c3f78	Refill spray bottles and wipes	2	f	\N	\N	2026-03-26 05:36:21.552	2026-03-26 05:36:21.552
\.


--
-- Data for Name: TaskCompletion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskCompletion" (id, "tenantId", "taskTemplateId", "assigneeEmployeeId", "occurrenceDate", status, "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TaskPhotoProof; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskPhotoProof" (id, "tenantId", "taskId", "taskCompletionId", "uploadedByEmployeeId", "fileName", "storageKey", "supersededByProofId", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TaskTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskTemplate" (id, "tenantId", "managerEmployeeId", "assigneeEmployeeId", "groupId", "departmentId", "locationId", title, description, priority, "requiresPhoto", "expandOnDemand", frequency, "weekDaysJson", "dayOfMonth", "startDate", "endDate", "dueAfterDays", "dueTimeLocal", "checklistJson", "lastGeneratedAt", "isActive", "createdAt", "updatedAt") FROM stdin;
f22caa69-d634-4e45-9452-cfd447eb2aa0	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	\N	\N	Weekly floor walk	Walk the floor, verify opening standards and record any issues that need follow-up.	MEDIUM	t	t	WEEKLY	[1,4]	\N	2026-03-25 17:00:00	\N	0	11:00	\N	\N	t	2026-03-26 05:36:24.691	2026-03-26 05:36:24.691
dfed6be1-2b7f-431b-8806-1fa8acd6d9c6	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	810a7883-40a2-49d8-9d5d-01591f65da75	\N	\N	\N	Monthly vendor approvals	Approve monthly supplier invoices and confirm replenishment windows.	HIGH	f	t	MONTHLY	\N	25	2026-03-25 17:00:00	\N	0	13:00	\N	\N	t	2026-03-26 05:36:24.691	2026-03-26 05:36:24.691
5af9bb3f-8b5e-4edd-8c2b-c74eec0613ea	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	\N	\N	Opening photo report	Upload fresh photos of the reception and first treatment room after opening prep.	HIGH	t	t	DAILY	\N	\N	2026-03-25 17:00:00	\N	0	09:30	\N	\N	t	2026-03-26 05:36:24.691	2026-03-26 05:36:24.691
ea29cff2-16db-49e2-abc2-0bc1daaaaf71	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	39f120b3-3621-436b-9076-abea21b3d0fd	\N	\N	\N	Weekly consumables count	Count gloves, wipes, towels and report anything that will run out before the weekend.	MEDIUM	f	t	WEEKLY	[2,5]	\N	2026-03-25 17:00:00	\N	0	18:00	\N	\N	t	2026-03-26 05:36:24.691	2026-03-26 05:36:24.691
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Tenant" (id, name, slug, timezone, locale, "createdAt", "updatedAt") FROM stdin;
c1737ed3-3d1a-4303-8f5b-80fd8ec02085	Beauty Life	demo	Asia/Novosibirsk	ru	2026-03-26 05:35:42.473	2026-03-26 05:35:42.473
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "tenantId", email, "passwordHash", status, "workspaceAccessAllowed", "createdAt", "updatedAt") FROM stdin;
157a14e0-183d-419c-9f9b-810a51363473	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	owner@demo.smart	$2b$10$Dii078ICquT9.D5Da2orMuy6nMMbBxJ2ECbhlKnOisxlZ8EpijBXy	ACTIVE	t	2026-03-26 05:35:52.374	2026-03-26 05:35:52.374
8ee4d6f9-df74-467b-bd9d-8336bee94cfb	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	employee@demo.smart	$2b$10$YZ9jHe11VztixBFcc.2.D.gMkzMUeAvb5eZ0NuyYRWreC3QXaw/5O	ACTIVE	t	2026-03-26 05:35:55.739	2026-03-26 05:35:55.739
bb47848b-31a6-44b5-aa8e-d8c4fa75b8dd	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	manager@demo.smart	$2b$10$YZ9jHe11VztixBFcc.2.D.gMkzMUeAvb5eZ0NuyYRWreC3QXaw/5O	ACTIVE	t	2026-03-26 05:35:57.754	2026-03-26 05:35:57.754
cb040e5a-76f7-45d3-901e-ca0d4108addc	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	julia@demo.smart	$2b$10$YZ9jHe11VztixBFcc.2.D.gMkzMUeAvb5eZ0NuyYRWreC3QXaw/5O	ACTIVE	t	2026-03-26 05:35:59.541	2026-03-26 05:35:59.541
3bbd286e-e358-4685-b9e8-0cef4cd150d9	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	sergey@demo.smart	$2b$10$YZ9jHe11VztixBFcc.2.D.gMkzMUeAvb5eZ0NuyYRWreC3QXaw/5O	ACTIVE	t	2026-03-26 05:36:01.33	2026-03-26 05:36:01.33
43d01af9-c2b4-4b14-b8fc-97b9110dd585	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	maria@demo.smart	$2b$10$YZ9jHe11VztixBFcc.2.D.gMkzMUeAvb5eZ0NuyYRWreC3QXaw/5O	ACTIVE	t	2026-03-26 05:36:03.143	2026-03-26 05:36:03.143
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserRole" (id, "userId", "roleId", "scopeType", "scopeId", "createdAt") FROM stdin;
6882b12a-f8d2-404e-bca8-e30dabbfb14e	157a14e0-183d-419c-9f9b-810a51363473	61db378c-03ca-48e4-9b78-f0ba4e7ee80e	tenant	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	2026-03-26 05:35:52.823
8ffb038c-15d1-496f-8ab5-8f61c600cf97	8ee4d6f9-df74-467b-bd9d-8336bee94cfb	ff02c359-f7f5-464b-9a8c-045719871072	tenant	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	2026-03-26 05:35:55.963
cec9cbdf-3c3b-4161-a689-068dac659cc2	bb47848b-31a6-44b5-aa8e-d8c4fa75b8dd	07cd8eba-b1f6-4ebe-a14a-a3e6e011e954	tenant	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	2026-03-26 05:35:57.978
2a3aff05-ac23-4f9b-a82d-4f6a11405a8a	cb040e5a-76f7-45d3-901e-ca0d4108addc	ff02c359-f7f5-464b-9a8c-045719871072	tenant	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	2026-03-26 05:35:59.764
92af2722-31f1-496b-b6de-8c3be3e0c1ca	3bbd286e-e358-4685-b9e8-0cef4cd150d9	ff02c359-f7f5-464b-9a8c-045719871072	tenant	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	2026-03-26 05:36:01.555
d2cadd72-1dd5-4de8-a101-357b6df7a2eb	43d01af9-c2b4-4b14-b8fc-97b9110dd585	ff02c359-f7f5-464b-9a8c-045719871072	tenant	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	2026-03-26 05:36:03.367
\.


--
-- Data for Name: WorkGroup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkGroup" (id, "tenantId", "managerEmployeeId", name, description, "createdAt", "updatedAt") FROM stdin;
db540ebd-de75-4de9-8128-c006a52372f8	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	810a7883-40a2-49d8-9d5d-01591f65da75	Frontline Operations	Core studio shift group	2026-03-26 05:36:17.073	2026-03-26 05:36:17.073
\.


--
-- Data for Name: WorkGroupMembership; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkGroupMembership" (id, "tenantId", "groupId", "employeeId", "createdAt") FROM stdin;
55e1b01b-0d89-46f7-88cf-2614d78a66eb	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	db540ebd-de75-4de9-8128-c006a52372f8	39f120b3-3621-436b-9076-abea21b3d0fd	2026-03-26 05:36:17.968
c8968985-9877-4569-ad9c-87df266f8235	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	db540ebd-de75-4de9-8128-c006a52372f8	e78d3178-ce78-45c9-9b44-c68daf8746cd	2026-03-26 05:36:17.968
a5ed4f5c-92ea-48f4-9de5-dc4bbdf89c2f	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	db540ebd-de75-4de9-8128-c006a52372f8	379400e2-eb6e-4286-9484-7709e503c27d	2026-03-26 05:36:17.968
38623351-50b7-4426-8e34-c3b826594a46	c1737ed3-3d1a-4303-8f5b-80fd8ec02085	db540ebd-de75-4de9-8128-c006a52372f8	87e17e40-e1cd-48c7-b400-cedeaffdd522	2026-03-26 05:36:17.968
\.


--
-- Name: AnnouncementTemplate AnnouncementTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementTemplate"
    ADD CONSTRAINT "AnnouncementTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalPolicy ApprovalPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalPolicy"
    ADD CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceAnomalyNotification AttendanceAnomalyNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceAnomalyNotification"
    ADD CONSTRAINT "AttendanceAnomalyNotification_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceBreak AttendanceBreak_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceBreak"
    ADD CONSTRAINT "AttendanceBreak_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceCorrectionComment AttendanceCorrectionComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionComment"
    ADD CONSTRAINT "AttendanceCorrectionComment_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceCorrectionRequest AttendanceCorrectionRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionRequest"
    ADD CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceEvent AttendanceEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceSession AttendanceSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BiometricArtifact BiometricArtifact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricArtifact"
    ADD CONSTRAINT "BiometricArtifact_pkey" PRIMARY KEY (id);


--
-- Name: BiometricJob BiometricJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricJob"
    ADD CONSTRAINT "BiometricJob_pkey" PRIMARY KEY (id);


--
-- Name: BiometricProfile BiometricProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricProfile"
    ADD CONSTRAINT "BiometricProfile_pkey" PRIMARY KEY (id);


--
-- Name: BiometricVerification BiometricVerification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricVerification"
    ADD CONSTRAINT "BiometricVerification_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: ChatParticipant ChatParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY (id);


--
-- Name: ChatThread ChatThread_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatThread"
    ADD CONSTRAINT "ChatThread_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: Device Device_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT "Device_pkey" PRIMARY KEY (id);


--
-- Name: DiagnosticsPolicy DiagnosticsPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiagnosticsPolicy"
    ADD CONSTRAINT "DiagnosticsPolicy_pkey" PRIMARY KEY (id);


--
-- Name: DiagnosticsSnapshot DiagnosticsSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiagnosticsSnapshot"
    ADD CONSTRAINT "DiagnosticsSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeInvitation EmployeeInvitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeRequest EmployeeRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeRequest"
    ADD CONSTRAINT "EmployeeRequest_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeTimeOffBalance EmployeeTimeOffBalance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffBalance"
    ADD CONSTRAINT "EmployeeTimeOffBalance_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeTimeOffTransaction EmployeeTimeOffTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffTransaction"
    ADD CONSTRAINT "EmployeeTimeOffTransaction_pkey" PRIMARY KEY (id);


--
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);


--
-- Name: ExportJob ExportJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExportJob"
    ADD CONSTRAINT "ExportJob_pkey" PRIMARY KEY (id);


--
-- Name: HolidayCalendarDay HolidayCalendarDay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HolidayCalendarDay"
    ADD CONSTRAINT "HolidayCalendarDay_pkey" PRIMARY KEY (id);


--
-- Name: Location Location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PayrollPolicy PayrollPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollPolicy"
    ADD CONSTRAINT "PayrollPolicy_pkey" PRIMARY KEY (id);


--
-- Name: Position Position_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_pkey" PRIMARY KEY (id);


--
-- Name: PushDelivery PushDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushDelivery"
    ADD CONSTRAINT "PushDelivery_pkey" PRIMARY KEY (id);


--
-- Name: PushDevice PushDevice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushDevice"
    ADD CONSTRAINT "PushDevice_pkey" PRIMARY KEY (id);


--
-- Name: RequestApprovalStep RequestApprovalStep_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestApprovalStep"
    ADD CONSTRAINT "RequestApprovalStep_pkey" PRIMARY KEY (id);


--
-- Name: RequestAttachment RequestAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestAttachment"
    ADD CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY (id);


--
-- Name: RequestComment RequestComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestComment"
    ADD CONSTRAINT "RequestComment_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: ShiftTemplate ShiftTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftTemplate"
    ADD CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Shift Shift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_pkey" PRIMARY KEY (id);


--
-- Name: TaskActivity TaskActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskActivity"
    ADD CONSTRAINT "TaskActivity_pkey" PRIMARY KEY (id);


--
-- Name: TaskAutomationPolicy TaskAutomationPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskAutomationPolicy"
    ADD CONSTRAINT "TaskAutomationPolicy_pkey" PRIMARY KEY (id);


--
-- Name: TaskChecklistItem TaskChecklistItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskChecklistItem"
    ADD CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY (id);


--
-- Name: TaskCompletion TaskCompletion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskCompletion"
    ADD CONSTRAINT "TaskCompletion_pkey" PRIMARY KEY (id);


--
-- Name: TaskPhotoProof TaskPhotoProof_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskPhotoProof"
    ADD CONSTRAINT "TaskPhotoProof_pkey" PRIMARY KEY (id);


--
-- Name: TaskTemplate TaskTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WorkGroupMembership WorkGroupMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkGroupMembership"
    ADD CONSTRAINT "WorkGroupMembership_pkey" PRIMARY KEY (id);


--
-- Name: WorkGroup WorkGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkGroup"
    ADD CONSTRAINT "WorkGroup_pkey" PRIMARY KEY (id);


--
-- Name: AnnouncementTemplate_tenantId_departmentId_isActive_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementTemplate_tenantId_departmentId_isActive_created_idx" ON public."AnnouncementTemplate" USING btree ("tenantId", "departmentId", "isActive", "createdAt");


--
-- Name: AnnouncementTemplate_tenantId_groupId_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementTemplate_tenantId_groupId_isActive_createdAt_idx" ON public."AnnouncementTemplate" USING btree ("tenantId", "groupId", "isActive", "createdAt");


--
-- Name: AnnouncementTemplate_tenantId_locationId_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementTemplate_tenantId_locationId_isActive_createdAt_idx" ON public."AnnouncementTemplate" USING btree ("tenantId", "locationId", "isActive", "createdAt");


--
-- Name: AnnouncementTemplate_tenantId_managerEmployeeId_isActive_cr_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementTemplate_tenantId_managerEmployeeId_isActive_cr_idx" ON public."AnnouncementTemplate" USING btree ("tenantId", "managerEmployeeId", "isActive", "createdAt");


--
-- Name: AnnouncementTemplate_tenantId_targetEmployeeId_isActive_cre_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementTemplate_tenantId_targetEmployeeId_isActive_cre_idx" ON public."AnnouncementTemplate" USING btree ("tenantId", "targetEmployeeId", "isActive", "createdAt");


--
-- Name: Announcement_tenantId_audience_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_tenantId_audience_createdAt_idx" ON public."Announcement" USING btree ("tenantId", audience, "createdAt");


--
-- Name: Announcement_tenantId_departmentId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_tenantId_departmentId_createdAt_idx" ON public."Announcement" USING btree ("tenantId", "departmentId", "createdAt");


--
-- Name: Announcement_tenantId_groupId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_tenantId_groupId_createdAt_idx" ON public."Announcement" USING btree ("tenantId", "groupId", "createdAt");


--
-- Name: Announcement_tenantId_locationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_tenantId_locationId_createdAt_idx" ON public."Announcement" USING btree ("tenantId", "locationId", "createdAt");


--
-- Name: Announcement_tenantId_targetEmployeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_tenantId_targetEmployeeId_createdAt_idx" ON public."Announcement" USING btree ("tenantId", "targetEmployeeId", "createdAt");


--
-- Name: ApprovalPolicy_tenantId_requestType_departmentId_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApprovalPolicy_tenantId_requestType_departmentId_locationId_idx" ON public."ApprovalPolicy" USING btree ("tenantId", "requestType", "departmentId", "locationId", priority);


--
-- Name: AttendanceAnomalyNotification_tenantId_anomalyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceAnomalyNotification_tenantId_anomalyKey_key" ON public."AttendanceAnomalyNotification" USING btree ("tenantId", "anomalyKey");


--
-- Name: AttendanceAnomalyNotification_tenantId_severity_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceAnomalyNotification_tenantId_severity_createdAt_idx" ON public."AttendanceAnomalyNotification" USING btree ("tenantId", severity, "createdAt");


--
-- Name: AttendanceBreak_endEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceBreak_endEventId_key" ON public."AttendanceBreak" USING btree ("endEventId");


--
-- Name: AttendanceBreak_startEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceBreak_startEventId_key" ON public."AttendanceBreak" USING btree ("startEventId");


--
-- Name: AttendanceBreak_tenantId_employeeId_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceBreak_tenantId_employeeId_startedAt_idx" ON public."AttendanceBreak" USING btree ("tenantId", "employeeId", "startedAt");


--
-- Name: AttendanceBreak_tenantId_sessionId_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceBreak_tenantId_sessionId_startedAt_idx" ON public."AttendanceBreak" USING btree ("tenantId", "sessionId", "startedAt");


--
-- Name: AttendanceCorrectionComment_tenantId_correctionRequestId_cr_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceCorrectionComment_tenantId_correctionRequestId_cr_idx" ON public."AttendanceCorrectionComment" USING btree ("tenantId", "correctionRequestId", "createdAt");


--
-- Name: AttendanceCorrectionRequest_tenantId_approverEmployeeId_sta_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceCorrectionRequest_tenantId_approverEmployeeId_sta_idx" ON public."AttendanceCorrectionRequest" USING btree ("tenantId", "approverEmployeeId", status, "createdAt");


--
-- Name: AttendanceCorrectionRequest_tenantId_employeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceCorrectionRequest_tenantId_employeeId_createdAt_idx" ON public."AttendanceCorrectionRequest" USING btree ("tenantId", "employeeId", "createdAt");


--
-- Name: AttendanceCorrectionRequest_tenantId_sessionId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceCorrectionRequest_tenantId_sessionId_createdAt_idx" ON public."AttendanceCorrectionRequest" USING btree ("tenantId", "sessionId", "createdAt");


--
-- Name: AttendanceEvent_tenantId_employeeId_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceEvent_tenantId_employeeId_occurredAt_idx" ON public."AttendanceEvent" USING btree ("tenantId", "employeeId", "occurredAt");


--
-- Name: AttendanceSession_checkInEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceSession_checkInEventId_key" ON public."AttendanceSession" USING btree ("checkInEventId");


--
-- Name: AttendanceSession_checkOutEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceSession_checkOutEventId_key" ON public."AttendanceSession" USING btree ("checkOutEventId");


--
-- Name: AttendanceSession_tenantId_employeeId_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceSession_tenantId_employeeId_startedAt_idx" ON public."AttendanceSession" USING btree ("tenantId", "employeeId", "startedAt");


--
-- Name: BiometricArtifact_tenantId_employeeId_kind_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BiometricArtifact_tenantId_employeeId_kind_createdAt_idx" ON public."BiometricArtifact" USING btree ("tenantId", "employeeId", kind, "createdAt");


--
-- Name: BiometricJob_tenantId_employeeId_type_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BiometricJob_tenantId_employeeId_type_status_createdAt_idx" ON public."BiometricJob" USING btree ("tenantId", "employeeId", type, status, "createdAt");


--
-- Name: BiometricProfile_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BiometricProfile_employeeId_key" ON public."BiometricProfile" USING btree ("employeeId");


--
-- Name: BiometricVerification_employeeId_manualReviewStatus_capture_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BiometricVerification_employeeId_manualReviewStatus_capture_idx" ON public."BiometricVerification" USING btree ("employeeId", "manualReviewStatus", "capturedAt");


--
-- Name: ChatMessage_tenantId_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMessage_tenantId_threadId_createdAt_idx" ON public."ChatMessage" USING btree ("tenantId", "threadId", "createdAt");


--
-- Name: ChatParticipant_tenantId_employeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatParticipant_tenantId_employeeId_createdAt_idx" ON public."ChatParticipant" USING btree ("tenantId", "employeeId", "createdAt");


--
-- Name: ChatParticipant_threadId_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ChatParticipant_threadId_employeeId_key" ON public."ChatParticipant" USING btree ("threadId", "employeeId");


--
-- Name: ChatThread_tenantId_groupId_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatThread_tenantId_groupId_updatedAt_idx" ON public."ChatThread" USING btree ("tenantId", "groupId", "updatedAt");


--
-- Name: ChatThread_tenantId_kind_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatThread_tenantId_kind_updatedAt_idx" ON public."ChatThread" USING btree ("tenantId", kind, "updatedAt");


--
-- Name: Company_tenantId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Company_tenantId_code_key" ON public."Company" USING btree ("tenantId", code);


--
-- Name: Department_tenantId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Department_tenantId_code_key" ON public."Department" USING btree ("tenantId", code);


--
-- Name: Device_employeeId_deviceFingerprint_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Device_employeeId_deviceFingerprint_key" ON public."Device" USING btree ("employeeId", "deviceFingerprint");


--
-- Name: DiagnosticsPolicy_tenantId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DiagnosticsPolicy_tenantId_key" ON public."DiagnosticsPolicy" USING btree ("tenantId");


--
-- Name: DiagnosticsSnapshot_tenantId_capturedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DiagnosticsSnapshot_tenantId_capturedAt_idx" ON public."DiagnosticsSnapshot" USING btree ("tenantId", "capturedAt");


--
-- Name: EmployeeInvitation_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeInvitation_employeeId_key" ON public."EmployeeInvitation" USING btree ("employeeId");


--
-- Name: EmployeeInvitation_tenantId_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeInvitation_tenantId_email_key" ON public."EmployeeInvitation" USING btree ("tenantId", email);


--
-- Name: EmployeeInvitation_tenantId_status_invitedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeInvitation_tenantId_status_invitedAt_idx" ON public."EmployeeInvitation" USING btree ("tenantId", status, "invitedAt");


--
-- Name: EmployeeInvitation_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeInvitation_tokenHash_key" ON public."EmployeeInvitation" USING btree ("tokenHash");


--
-- Name: EmployeeInvitation_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeInvitation_userId_key" ON public."EmployeeInvitation" USING btree ("userId");


--
-- Name: EmployeeRequest_tenantId_employeeId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeRequest_tenantId_employeeId_status_createdAt_idx" ON public."EmployeeRequest" USING btree ("tenantId", "employeeId", status, "createdAt");


--
-- Name: EmployeeTimeOffBalance_employeeId_kind_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeTimeOffBalance_employeeId_kind_key" ON public."EmployeeTimeOffBalance" USING btree ("employeeId", kind);


--
-- Name: EmployeeTimeOffBalance_tenantId_kind_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeTimeOffBalance_tenantId_kind_updatedAt_idx" ON public."EmployeeTimeOffBalance" USING btree ("tenantId", kind, "updatedAt");


--
-- Name: EmployeeTimeOffTransaction_tenantId_employeeId_kind_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeTimeOffTransaction_tenantId_employeeId_kind_created_idx" ON public."EmployeeTimeOffTransaction" USING btree ("tenantId", "employeeId", kind, "createdAt");


--
-- Name: EmployeeTimeOffTransaction_tenantId_requestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeTimeOffTransaction_tenantId_requestId_idx" ON public."EmployeeTimeOffTransaction" USING btree ("tenantId", "requestId");


--
-- Name: Employee_tenantId_employeeNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Employee_tenantId_employeeNumber_key" ON public."Employee" USING btree ("tenantId", "employeeNumber");


--
-- Name: Employee_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Employee_userId_key" ON public."Employee" USING btree ("userId");


--
-- Name: ExportJob_requestedByUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExportJob_requestedByUserId_createdAt_idx" ON public."ExportJob" USING btree ("requestedByUserId", "createdAt");


--
-- Name: ExportJob_tenantId_type_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExportJob_tenantId_type_status_createdAt_idx" ON public."ExportJob" USING btree ("tenantId", type, status, "createdAt");


--
-- Name: HolidayCalendarDay_tenantId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HolidayCalendarDay_tenantId_date_idx" ON public."HolidayCalendarDay" USING btree ("tenantId", date);


--
-- Name: HolidayCalendarDay_tenantId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HolidayCalendarDay_tenantId_date_key" ON public."HolidayCalendarDay" USING btree ("tenantId", date);


--
-- Name: Location_tenantId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Location_tenantId_code_key" ON public."Location" USING btree ("tenantId", code);


--
-- Name: Notification_tenantId_userId_isRead_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_tenantId_userId_isRead_createdAt_idx" ON public."Notification" USING btree ("tenantId", "userId", "isRead", "createdAt");


--
-- Name: PayrollPolicy_tenantId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PayrollPolicy_tenantId_key" ON public."PayrollPolicy" USING btree ("tenantId");


--
-- Name: Position_tenantId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Position_tenantId_code_key" ON public."Position" USING btree ("tenantId", code);


--
-- Name: PushDelivery_tenantId_userId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PushDelivery_tenantId_userId_status_createdAt_idx" ON public."PushDelivery" USING btree ("tenantId", "userId", status, "createdAt");


--
-- Name: PushDevice_tenantId_userId_provider_isEnabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PushDevice_tenantId_userId_provider_isEnabled_idx" ON public."PushDevice" USING btree ("tenantId", "userId", provider, "isEnabled");


--
-- Name: PushDevice_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PushDevice_token_key" ON public."PushDevice" USING btree (token);


--
-- Name: RequestApprovalStep_requestId_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RequestApprovalStep_requestId_sequence_key" ON public."RequestApprovalStep" USING btree ("requestId", sequence);


--
-- Name: RequestApprovalStep_tenantId_approverEmployeeId_status_crea_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RequestApprovalStep_tenantId_approverEmployeeId_status_crea_idx" ON public."RequestApprovalStep" USING btree ("tenantId", "approverEmployeeId", status, "createdAt");


--
-- Name: RequestAttachment_tenantId_requestId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RequestAttachment_tenantId_requestId_createdAt_idx" ON public."RequestAttachment" USING btree ("tenantId", "requestId", "createdAt");


--
-- Name: RequestComment_tenantId_requestId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RequestComment_tenantId_requestId_createdAt_idx" ON public."RequestComment" USING btree ("tenantId", "requestId", "createdAt");


--
-- Name: Role_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_code_key" ON public."Role" USING btree (code);


--
-- Name: ShiftTemplate_tenantId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ShiftTemplate_tenantId_code_key" ON public."ShiftTemplate" USING btree ("tenantId", code);


--
-- Name: Shift_tenantId_employeeId_shiftDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Shift_tenantId_employeeId_shiftDate_idx" ON public."Shift" USING btree ("tenantId", "employeeId", "shiftDate");


--
-- Name: TaskActivity_tenantId_taskId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskActivity_tenantId_taskId_createdAt_idx" ON public."TaskActivity" USING btree ("tenantId", "taskId", "createdAt");


--
-- Name: TaskAutomationPolicy_tenantId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TaskAutomationPolicy_tenantId_key" ON public."TaskAutomationPolicy" USING btree ("tenantId");


--
-- Name: TaskChecklistItem_tenantId_taskId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskChecklistItem_tenantId_taskId_sortOrder_idx" ON public."TaskChecklistItem" USING btree ("tenantId", "taskId", "sortOrder");


--
-- Name: TaskCompletion_taskTemplateId_assigneeEmployeeId_occurrence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TaskCompletion_taskTemplateId_assigneeEmployeeId_occurrence_key" ON public."TaskCompletion" USING btree ("taskTemplateId", "assigneeEmployeeId", "occurrenceDate");


--
-- Name: TaskCompletion_tenantId_assigneeEmployeeId_occurrenceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskCompletion_tenantId_assigneeEmployeeId_occurrenceDate_idx" ON public."TaskCompletion" USING btree ("tenantId", "assigneeEmployeeId", "occurrenceDate");


--
-- Name: TaskCompletion_tenantId_taskTemplateId_occurrenceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskCompletion_tenantId_taskTemplateId_occurrenceDate_idx" ON public."TaskCompletion" USING btree ("tenantId", "taskTemplateId", "occurrenceDate");


--
-- Name: TaskPhotoProof_tenantId_taskCompletionId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskPhotoProof_tenantId_taskCompletionId_createdAt_idx" ON public."TaskPhotoProof" USING btree ("tenantId", "taskCompletionId", "createdAt");


--
-- Name: TaskPhotoProof_tenantId_taskId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskPhotoProof_tenantId_taskId_createdAt_idx" ON public."TaskPhotoProof" USING btree ("tenantId", "taskId", "createdAt");


--
-- Name: TaskPhotoProof_tenantId_uploadedByEmployeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskPhotoProof_tenantId_uploadedByEmployeeId_createdAt_idx" ON public."TaskPhotoProof" USING btree ("tenantId", "uploadedByEmployeeId", "createdAt");


--
-- Name: TaskTemplate_tenantId_assigneeEmployeeId_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTemplate_tenantId_assigneeEmployeeId_isActive_createdAt_idx" ON public."TaskTemplate" USING btree ("tenantId", "assigneeEmployeeId", "isActive", "createdAt");


--
-- Name: TaskTemplate_tenantId_departmentId_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTemplate_tenantId_departmentId_isActive_createdAt_idx" ON public."TaskTemplate" USING btree ("tenantId", "departmentId", "isActive", "createdAt");


--
-- Name: TaskTemplate_tenantId_groupId_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTemplate_tenantId_groupId_isActive_createdAt_idx" ON public."TaskTemplate" USING btree ("tenantId", "groupId", "isActive", "createdAt");


--
-- Name: TaskTemplate_tenantId_locationId_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTemplate_tenantId_locationId_isActive_createdAt_idx" ON public."TaskTemplate" USING btree ("tenantId", "locationId", "isActive", "createdAt");


--
-- Name: TaskTemplate_tenantId_managerEmployeeId_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTemplate_tenantId_managerEmployeeId_isActive_createdAt_idx" ON public."TaskTemplate" USING btree ("tenantId", "managerEmployeeId", "isActive", "createdAt");


--
-- Name: Task_tenantId_assigneeEmployeeId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_tenantId_assigneeEmployeeId_status_createdAt_idx" ON public."Task" USING btree ("tenantId", "assigneeEmployeeId", status, "createdAt");


--
-- Name: Task_tenantId_groupId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_tenantId_groupId_status_createdAt_idx" ON public."Task" USING btree ("tenantId", "groupId", status, "createdAt");


--
-- Name: Task_tenantId_managerEmployeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_tenantId_managerEmployeeId_createdAt_idx" ON public."Task" USING btree ("tenantId", "managerEmployeeId", "createdAt");


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: UserRole_userId_roleId_scopeType_scopeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserRole_userId_roleId_scopeType_scopeId_key" ON public."UserRole" USING btree ("userId", "roleId", "scopeType", "scopeId");


--
-- Name: User_tenantId_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_tenantId_email_key" ON public."User" USING btree ("tenantId", email);


--
-- Name: WorkGroupMembership_groupId_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkGroupMembership_groupId_employeeId_key" ON public."WorkGroupMembership" USING btree ("groupId", "employeeId");


--
-- Name: WorkGroupMembership_tenantId_employeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkGroupMembership_tenantId_employeeId_createdAt_idx" ON public."WorkGroupMembership" USING btree ("tenantId", "employeeId", "createdAt");


--
-- Name: WorkGroup_tenantId_managerEmployeeId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkGroup_tenantId_managerEmployeeId_createdAt_idx" ON public."WorkGroup" USING btree ("tenantId", "managerEmployeeId", "createdAt");


--
-- Name: WorkGroup_tenantId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkGroup_tenantId_name_key" ON public."WorkGroup" USING btree ("tenantId", name);


--
-- Name: AnnouncementTemplate AnnouncementTemplate_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementTemplate"
    ADD CONSTRAINT "AnnouncementTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AnnouncementTemplate AnnouncementTemplate_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementTemplate"
    ADD CONSTRAINT "AnnouncementTemplate_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."WorkGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AnnouncementTemplate AnnouncementTemplate_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementTemplate"
    ADD CONSTRAINT "AnnouncementTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AnnouncementTemplate AnnouncementTemplate_managerEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementTemplate"
    ADD CONSTRAINT "AnnouncementTemplate_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AnnouncementTemplate AnnouncementTemplate_targetEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementTemplate"
    ADD CONSTRAINT "AnnouncementTemplate_targetEmployeeId_fkey" FOREIGN KEY ("targetEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AnnouncementTemplate AnnouncementTemplate_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementTemplate"
    ADD CONSTRAINT "AnnouncementTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Announcement Announcement_authorEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Announcement Announcement_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Announcement Announcement_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."WorkGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Announcement Announcement_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Announcement Announcement_targetEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_targetEmployeeId_fkey" FOREIGN KEY ("targetEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Announcement Announcement_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovalPolicy ApprovalPolicy_approverEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalPolicy"
    ADD CONSTRAINT "ApprovalPolicy_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovalPolicy ApprovalPolicy_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalPolicy"
    ADD CONSTRAINT "ApprovalPolicy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ApprovalPolicy ApprovalPolicy_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalPolicy"
    ADD CONSTRAINT "ApprovalPolicy_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ApprovalPolicy ApprovalPolicy_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalPolicy"
    ADD CONSTRAINT "ApprovalPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceAnomalyNotification AttendanceAnomalyNotification_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceAnomalyNotification"
    ADD CONSTRAINT "AttendanceAnomalyNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceBreak AttendanceBreak_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceBreak"
    ADD CONSTRAINT "AttendanceBreak_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceBreak AttendanceBreak_endEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceBreak"
    ADD CONSTRAINT "AttendanceBreak_endEventId_fkey" FOREIGN KEY ("endEventId") REFERENCES public."AttendanceEvent"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceBreak AttendanceBreak_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceBreak"
    ADD CONSTRAINT "AttendanceBreak_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."AttendanceSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceBreak AttendanceBreak_startEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceBreak"
    ADD CONSTRAINT "AttendanceBreak_startEventId_fkey" FOREIGN KEY ("startEventId") REFERENCES public."AttendanceEvent"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceBreak AttendanceBreak_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceBreak"
    ADD CONSTRAINT "AttendanceBreak_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionComment AttendanceCorrectionComment_authorEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionComment"
    ADD CONSTRAINT "AttendanceCorrectionComment_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionComment AttendanceCorrectionComment_correctionRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionComment"
    ADD CONSTRAINT "AttendanceCorrectionComment_correctionRequestId_fkey" FOREIGN KEY ("correctionRequestId") REFERENCES public."AttendanceCorrectionRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionComment AttendanceCorrectionComment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionComment"
    ADD CONSTRAINT "AttendanceCorrectionComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionRequest AttendanceCorrectionRequest_approverEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionRequest"
    ADD CONSTRAINT "AttendanceCorrectionRequest_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionRequest AttendanceCorrectionRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionRequest"
    ADD CONSTRAINT "AttendanceCorrectionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionRequest AttendanceCorrectionRequest_requestedByEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionRequest"
    ADD CONSTRAINT "AttendanceCorrectionRequest_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionRequest AttendanceCorrectionRequest_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionRequest"
    ADD CONSTRAINT "AttendanceCorrectionRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."AttendanceSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceCorrectionRequest AttendanceCorrectionRequest_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceCorrectionRequest"
    ADD CONSTRAINT "AttendanceCorrectionRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceEvent AttendanceEvent_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public."Device"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceEvent AttendanceEvent_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceEvent AttendanceEvent_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceEvent AttendanceEvent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceSession AttendanceSession_checkInEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_checkInEventId_fkey" FOREIGN KEY ("checkInEventId") REFERENCES public."AttendanceEvent"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceSession AttendanceSession_checkOutEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_checkOutEventId_fkey" FOREIGN KEY ("checkOutEventId") REFERENCES public."AttendanceEvent"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceSession AttendanceSession_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceSession AttendanceSession_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceSession AttendanceSession_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceSession"
    ADD CONSTRAINT "AttendanceSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BiometricArtifact BiometricArtifact_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricArtifact"
    ADD CONSTRAINT "BiometricArtifact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BiometricArtifact BiometricArtifact_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricArtifact"
    ADD CONSTRAINT "BiometricArtifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BiometricArtifact BiometricArtifact_verificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricArtifact"
    ADD CONSTRAINT "BiometricArtifact_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES public."BiometricVerification"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BiometricJob BiometricJob_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricJob"
    ADD CONSTRAINT "BiometricJob_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BiometricJob BiometricJob_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricJob"
    ADD CONSTRAINT "BiometricJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BiometricProfile BiometricProfile_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricProfile"
    ADD CONSTRAINT "BiometricProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BiometricVerification BiometricVerification_attendanceEventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricVerification"
    ADD CONSTRAINT "BiometricVerification_attendanceEventId_fkey" FOREIGN KEY ("attendanceEventId") REFERENCES public."AttendanceEvent"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BiometricVerification BiometricVerification_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricVerification"
    ADD CONSTRAINT "BiometricVerification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BiometricVerification BiometricVerification_reviewerEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BiometricVerification"
    ADD CONSTRAINT "BiometricVerification_reviewerEmployeeId_fkey" FOREIGN KEY ("reviewerEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatMessage ChatMessage_authorEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public."ChatThread"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatParticipant ChatParticipant_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatParticipant ChatParticipant_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatParticipant ChatParticipant_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public."ChatThread"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatThread ChatThread_createdByEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatThread"
    ADD CONSTRAINT "ChatThread_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatThread ChatThread_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatThread"
    ADD CONSTRAINT "ChatThread_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."WorkGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatThread ChatThread_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatThread"
    ADD CONSTRAINT "ChatThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Company Company_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Department Department_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Device Device_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT "Device_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DiagnosticsPolicy DiagnosticsPolicy_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiagnosticsPolicy"
    ADD CONSTRAINT "DiagnosticsPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DiagnosticsSnapshot DiagnosticsSnapshot_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiagnosticsSnapshot"
    ADD CONSTRAINT "DiagnosticsSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeInvitation EmployeeInvitation_approvedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeInvitation EmployeeInvitation_approvedGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_approvedGroupId_fkey" FOREIGN KEY ("approvedGroupId") REFERENCES public."WorkGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeInvitation EmployeeInvitation_approvedShiftTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_approvedShiftTemplateId_fkey" FOREIGN KEY ("approvedShiftTemplateId") REFERENCES public."ShiftTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeInvitation EmployeeInvitation_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeInvitation EmployeeInvitation_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeInvitation EmployeeInvitation_invitedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeInvitation EmployeeInvitation_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeInvitation EmployeeInvitation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeInvitation"
    ADD CONSTRAINT "EmployeeInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeRequest EmployeeRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeRequest"
    ADD CONSTRAINT "EmployeeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeRequest EmployeeRequest_managerEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeRequest"
    ADD CONSTRAINT "EmployeeRequest_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeRequest EmployeeRequest_relatedRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeRequest"
    ADD CONSTRAINT "EmployeeRequest_relatedRequestId_fkey" FOREIGN KEY ("relatedRequestId") REFERENCES public."EmployeeRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeRequest EmployeeRequest_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeRequest"
    ADD CONSTRAINT "EmployeeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeTimeOffBalance EmployeeTimeOffBalance_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffBalance"
    ADD CONSTRAINT "EmployeeTimeOffBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeTimeOffBalance EmployeeTimeOffBalance_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffBalance"
    ADD CONSTRAINT "EmployeeTimeOffBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeTimeOffTransaction EmployeeTimeOffTransaction_balanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffTransaction"
    ADD CONSTRAINT "EmployeeTimeOffTransaction_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES public."EmployeeTimeOffBalance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeTimeOffTransaction EmployeeTimeOffTransaction_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffTransaction"
    ADD CONSTRAINT "EmployeeTimeOffTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmployeeTimeOffTransaction EmployeeTimeOffTransaction_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffTransaction"
    ADD CONSTRAINT "EmployeeTimeOffTransaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."EmployeeRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeTimeOffTransaction EmployeeTimeOffTransaction_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeTimeOffTransaction"
    ADD CONSTRAINT "EmployeeTimeOffTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."Position"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_primaryLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExportJob ExportJob_requestedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExportJob"
    ADD CONSTRAINT "ExportJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExportJob ExportJob_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExportJob"
    ADD CONSTRAINT "ExportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HolidayCalendarDay HolidayCalendarDay_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HolidayCalendarDay"
    ADD CONSTRAINT "HolidayCalendarDay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Location Location_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Location Location_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PayrollPolicy PayrollPolicy_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PayrollPolicy"
    ADD CONSTRAINT "PayrollPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Position Position_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PushDelivery PushDelivery_notificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushDelivery"
    ADD CONSTRAINT "PushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES public."Notification"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PushDelivery PushDelivery_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushDelivery"
    ADD CONSTRAINT "PushDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PushDelivery PushDelivery_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushDelivery"
    ADD CONSTRAINT "PushDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PushDevice PushDevice_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushDevice"
    ADD CONSTRAINT "PushDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PushDevice PushDevice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushDevice"
    ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestApprovalStep RequestApprovalStep_approverEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestApprovalStep"
    ADD CONSTRAINT "RequestApprovalStep_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestApprovalStep RequestApprovalStep_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestApprovalStep"
    ADD CONSTRAINT "RequestApprovalStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."EmployeeRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestApprovalStep RequestApprovalStep_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestApprovalStep"
    ADD CONSTRAINT "RequestApprovalStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestAttachment RequestAttachment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestAttachment"
    ADD CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."EmployeeRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestAttachment RequestAttachment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestAttachment"
    ADD CONSTRAINT "RequestAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestAttachment RequestAttachment_uploadedByEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestAttachment"
    ADD CONSTRAINT "RequestAttachment_uploadedByEmployeeId_fkey" FOREIGN KEY ("uploadedByEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestComment RequestComment_authorEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestComment"
    ADD CONSTRAINT "RequestComment_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestComment RequestComment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestComment"
    ADD CONSTRAINT "RequestComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."EmployeeRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestComment RequestComment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RequestComment"
    ADD CONSTRAINT "RequestComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShiftTemplate ShiftTemplate_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftTemplate"
    ADD CONSTRAINT "ShiftTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShiftTemplate ShiftTemplate_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftTemplate"
    ADD CONSTRAINT "ShiftTemplate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."Position"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShiftTemplate ShiftTemplate_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShiftTemplate"
    ADD CONSTRAINT "ShiftTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Shift Shift_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Shift Shift_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Shift Shift_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."Position"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Shift Shift_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."ShiftTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Shift Shift_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskActivity TaskActivity_actorEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskActivity"
    ADD CONSTRAINT "TaskActivity_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskActivity TaskActivity_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskActivity"
    ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskActivity TaskActivity_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskActivity"
    ADD CONSTRAINT "TaskActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskAutomationPolicy TaskAutomationPolicy_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskAutomationPolicy"
    ADD CONSTRAINT "TaskAutomationPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskChecklistItem TaskChecklistItem_completedByEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskChecklistItem"
    ADD CONSTRAINT "TaskChecklistItem_completedByEmployeeId_fkey" FOREIGN KEY ("completedByEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskChecklistItem TaskChecklistItem_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskChecklistItem"
    ADD CONSTRAINT "TaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskChecklistItem TaskChecklistItem_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskChecklistItem"
    ADD CONSTRAINT "TaskChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskCompletion TaskCompletion_assigneeEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskCompletion"
    ADD CONSTRAINT "TaskCompletion_assigneeEmployeeId_fkey" FOREIGN KEY ("assigneeEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskCompletion TaskCompletion_taskTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskCompletion"
    ADD CONSTRAINT "TaskCompletion_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES public."TaskTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskCompletion TaskCompletion_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskCompletion"
    ADD CONSTRAINT "TaskCompletion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskPhotoProof TaskPhotoProof_supersededByProofId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskPhotoProof"
    ADD CONSTRAINT "TaskPhotoProof_supersededByProofId_fkey" FOREIGN KEY ("supersededByProofId") REFERENCES public."TaskPhotoProof"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskPhotoProof TaskPhotoProof_taskCompletionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskPhotoProof"
    ADD CONSTRAINT "TaskPhotoProof_taskCompletionId_fkey" FOREIGN KEY ("taskCompletionId") REFERENCES public."TaskCompletion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskPhotoProof TaskPhotoProof_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskPhotoProof"
    ADD CONSTRAINT "TaskPhotoProof_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskPhotoProof TaskPhotoProof_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskPhotoProof"
    ADD CONSTRAINT "TaskPhotoProof_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskPhotoProof TaskPhotoProof_uploadedByEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskPhotoProof"
    ADD CONSTRAINT "TaskPhotoProof_uploadedByEmployeeId_fkey" FOREIGN KEY ("uploadedByEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskTemplate TaskTemplate_assigneeEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_assigneeEmployeeId_fkey" FOREIGN KEY ("assigneeEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskTemplate TaskTemplate_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskTemplate TaskTemplate_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."WorkGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskTemplate TaskTemplate_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TaskTemplate TaskTemplate_managerEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskTemplate TaskTemplate_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTemplate"
    ADD CONSTRAINT "TaskTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_assigneeEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_assigneeEmployeeId_fkey" FOREIGN KEY ("assigneeEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."WorkGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_managerEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkGroupMembership WorkGroupMembership_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkGroupMembership"
    ADD CONSTRAINT "WorkGroupMembership_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkGroupMembership WorkGroupMembership_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkGroupMembership"
    ADD CONSTRAINT "WorkGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."WorkGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkGroupMembership WorkGroupMembership_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkGroupMembership"
    ADD CONSTRAINT "WorkGroupMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkGroup WorkGroup_managerEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkGroup"
    ADD CONSTRAINT "WorkGroup_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkGroup WorkGroup_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkGroup"
    ADD CONSTRAINT "WorkGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Q3zVBbV7ntp7TjtHVZAbecUFpssGMyQiJNIxxqaeiahpj42sPkgPtvPWmcReyp2

