--
-- PostgreSQL database dump
--

\restrict RXNxiCp4Utm99IXu0ibnMbLzq1Ut5BvClbvAisdrYeYnelmnx0kSrbQCBHBWP6a

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
    'CLOSED',
    'ON_BREAK'
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
    'ATTENDANCE_CORRECTION_ACTION_REQUIRED',
    'ATTENDANCE_CORRECTION_APPROVED',
    'ATTENDANCE_CORRECTION_REJECTED',
    'ATTENDANCE_ANOMALY_CRITICAL',
    'DAILY_DIGEST',
    'BIOMETRIC_REVIEW_ACTION_REQUIRED',
    'BIOMETRIC_REVIEW_APPROVED',
    'BIOMETRIC_REVIEW_REJECTED',
    'OPERATIONS_ALERT',
    'EMPLOYEE_APPROVAL_ACTION_REQUIRED',
    'EMPLOYEE_APPROVED',
    'EMPLOYEE_REJECTED'
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
    'SHIFT_CHANGE',
    'ADVANCE',
    'SUPPLY',
    'GENERAL',
    'VACATION_CHANGE',
    'UNPAID_LEAVE'
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
    title text NOT NULL,
    body text NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "departmentId" text,
    "locationId" text
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "departmentId" text,
    "locationId" text
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
    "checkInEventId" text NOT NULL,
    "checkOutEventId" text,
    status public."AttendanceSessionStatus" DEFAULT 'OPEN'::public."AttendanceSessionStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "totalMinutes" integer DEFAULT 0 NOT NULL,
    "lateMinutes" integer DEFAULT 0 NOT NULL,
    "earlyLeaveMinutes" integer DEFAULT 0 NOT NULL,
    "breakMinutes" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "shiftId" text,
    "paidBreakMinutes" integer DEFAULT 0 NOT NULL
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
    "livenessScore" double precision,
    "matchScore" double precision,
    "reviewReason" text,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    provider text DEFAULT 'internal-placeholder'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "manualReviewStatus" public."BiometricManualReviewStatus",
    "reviewedAt" timestamp(3) without time zone,
    "reviewerComment" text,
    "reviewerEmployeeId" text
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
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "googlePlaceId" text,
    "logoUrl" text
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
    status public."EmployeeStatus" DEFAULT 'ACTIVE'::public."EmployeeStatus" NOT NULL,
    "hireDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "birthDate" timestamp(3) without time zone,
    "avatarStorageKey" text,
    "avatarUrl" text,
    gender text,
    phone text
);


--
-- Name: EmployeeInvitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeInvitation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    email text NOT NULL,
    "invitedByUserId" text NOT NULL,
    "userId" text,
    "approvedByUserId" text,
    "employeeId" text,
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvedGroupId" text,
    "approvedShiftTemplateId" text,
    "companyId" text
);


--
-- Name: EmployeeRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeRequest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "managerEmployeeId" text,
    "requestType" public."RequestType" NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    title text NOT NULL,
    reason text,
    "startsOn" timestamp(3) without time zone NOT NULL,
    "endsOn" timestamp(3) without time zone NOT NULL,
    "requestedDays" integer NOT NULL,
    "currentStep" integer DEFAULT 1 NOT NULL,
    "finalDecisionAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "relatedRequestId" text,
    "requestContextJson" text
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
    "latenessPenaltyPerMinute" double precision DEFAULT 0 NOT NULL,
    "earlyLeavePenaltyPerMinute" double precision DEFAULT 0 NOT NULL,
    "leavePaidRatio" double precision DEFAULT 1 NOT NULL,
    "sickLeavePaidRatio" double precision DEFAULT 0.8 NOT NULL,
    "standardShiftMinutes" integer DEFAULT 480 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "holidayMultiplier" double precision DEFAULT 2 NOT NULL,
    "holidayOvertimeMultiplier" double precision DEFAULT 3 NOT NULL,
    "nightPremiumMultiplier" double precision DEFAULT 0.2 NOT NULL,
    "nightShiftEndLocal" text DEFAULT '06:00'::text NOT NULL,
    "nightShiftStartLocal" text DEFAULT '22:00'::text NOT NULL,
    "weekendOvertimeMultiplier" double precision DEFAULT 2.5 NOT NULL,
    "defaultBreakIsPaid" boolean DEFAULT false NOT NULL,
    "mandatoryBreakDurationMinutes" integer DEFAULT 30 NOT NULL,
    "mandatoryBreakThresholdMinutes" integer DEFAULT 360 NOT NULL,
    "maxBreakMinutes" integer DEFAULT 60 NOT NULL
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
    "errorMessage" text,
    attempts integer DEFAULT 0 NOT NULL,
    "deliveredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "receiptStatus" public."PushReceiptStatus",
    "receiptsCheckedAt" timestamp(3) without time zone,
    "receiptsJson" text
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
    "gracePeriodMinutes" integer DEFAULT 10 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "weekDaysJson" text
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
    "dueAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastEscalatedAt" timestamp(3) without time zone,
    "lastReminderAt" timestamp(3) without time zone,
    "requiresPhoto" boolean DEFAULT false NOT NULL
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
    title text NOT NULL,
    description text,
    priority public."TaskPriority" DEFAULT 'MEDIUM'::public."TaskPriority" NOT NULL,
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "departmentId" text,
    "locationId" text,
    "expandOnDemand" boolean DEFAULT false NOT NULL,
    "requiresPhoto" boolean DEFAULT false NOT NULL
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
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "workspaceAccessAllowed" boolean DEFAULT true NOT NULL
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

COPY public."Announcement" (id, "tenantId", "authorEmployeeId", audience, "groupId", "targetEmployeeId", title, body, "isPinned", "createdAt", "updatedAt", "departmentId", "locationId") FROM stdin;
\.


--
-- Data for Name: AnnouncementTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnnouncementTemplate" (id, "tenantId", "managerEmployeeId", audience, "groupId", "targetEmployeeId", title, body, "isPinned", frequency, "weekDaysJson", "dayOfMonth", "startDate", "endDate", "publishTimeLocal", "lastPublishedAt", "isActive", "createdAt", "updatedAt", "departmentId", "locationId") FROM stdin;
\.


--
-- Data for Name: ApprovalPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApprovalPolicy" (id, "tenantId", "requestType", "departmentId", "locationId", "approverEmployeeId", priority, "createdAt", "updatedAt") FROM stdin;
f8874b2f-0678-4953-b992-d9ab45835109-leave-owner	f8874b2f-0678-4953-b992-d9ab45835109	LEAVE	\N	\N	359ca1a4-307d-4005-832f-0d6a408866aa	1	2026-03-07 07:38:45.213	2026-03-26 05:35:09.111
f8874b2f-0678-4953-b992-d9ab45835109-sick-owner	f8874b2f-0678-4953-b992-d9ab45835109	SICK_LEAVE	\N	\N	359ca1a4-307d-4005-832f-0d6a408866aa	1	2026-03-07 07:38:45.233	2026-03-26 05:35:09.113
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
4d1d6117-de2d-4035-9224-9289bef4355b	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	27cc4df9-9224-4f11-a8e7-d4fdbc605ffc	043ada4a-c961-4ba2-a6c3-f0f46d8dac2b	\N	f	2026-03-12 06:16:23.507	\N	0	2026-03-12 08:16:23.51	2026-03-12 08:16:23.51
acf1b39c-5676-45e5-b4ec-4494fe53369a	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	b3ac8e72-3870-40b3-ab94-c29629bff3fc	2283951d-2a0c-4ced-9b10-93fff6d8c2f8	\N	f	2026-03-22 12:40:01.311	\N	0	2026-03-22 14:40:01.316	2026-03-22 14:40:01.316
03a74e81-5984-4588-b074-8d96314ca11f	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	1fc970c4-83d4-46bc-b8dd-edf77c980892	96437d94-9f0d-4b70-8fce-003ab98986e5	\N	f	2026-03-24 06:13:39.74	\N	0	2026-03-24 08:13:39.744	2026-03-24 08:13:39.744
aa5e4fa8-e2bc-4dbd-b3ac-673be4286a82	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	63454788-01c3-48c7-8ceb-ffb486c9a405	0bcc1771-3e76-4167-9b33-ea1e513936e1	\N	f	2026-03-26 03:35:09.161	\N	0	2026-03-26 05:35:09.165	2026-03-26 05:35:09.165
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
2fb08d4a-a2c6-4f36-8871-149dab0b7c1f	f8874b2f-0678-4953-b992-d9ab45835109	cfb108b5-d63f-4680-ac17-6e0115f66405	CHECK_IN	ACCEPTED	2026-03-12 06:16:23.501	2026-03-12 08:16:23.503	55.0302	82.9204	8	12	Seeded live shift	9273eef7-628d-4b05-be13-8136d070eb0a	0215f91e-b5c8-4a62-87bb-c5e5ad31c16c	2026-03-12 08:16:23.503
15fabb92-1fc4-41b3-9e31-e3a024ab7728	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	CHECK_IN	ACCEPTED	2026-03-12 04:16:23.506	2026-03-12 08:16:23.507	55.0302	82.9204	6	10	Seeded break shift	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-12 08:16:23.507
043ada4a-c961-4ba2-a6c3-f0f46d8dac2b	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	BREAK_START	ACCEPTED	2026-03-12 06:16:23.507	2026-03-12 08:16:23.508	55.0302	82.9204	6	14	Seeded long break	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-12 08:16:23.508
8d56b3d8-1e1e-4800-9b5a-78b5b97740c3	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_IN	ACCEPTED	2026-03-12 02:16:23.51	2026-03-12 08:16:23.512	55.0302	82.9204	7	11	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-12 08:16:23.512
4cc652ce-afdb-4957-a62c-4a288bb2b2bf	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_OUT	ACCEPTED	2026-03-12 06:16:23.511	2026-03-12 08:16:23.513	55.0302	82.9204	7	9	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-12 08:16:23.513
82630474-8e71-4fb7-8128-e77889a0333f	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	CHECK_IN	ACCEPTED	2026-03-22 10:40:01.309	2026-03-22 14:40:01.31	55.0302	82.9204	6	10	Seeded break shift	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-22 14:40:01.31
2283951d-2a0c-4ced-9b10-93fff6d8c2f8	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	BREAK_START	ACCEPTED	2026-03-22 12:40:01.311	2026-03-22 14:40:01.313	55.0302	82.9204	6	14	Seeded long break	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-22 14:40:01.313
e20f9e9e-7a57-453b-a1cb-eb0daf0ddd09	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_IN	ACCEPTED	2026-03-22 08:40:01.316	2026-03-22 14:40:01.318	55.0302	82.9204	7	11	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-22 14:40:01.318
a2d3e702-ea16-4e27-9255-5792d5539f3e	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_OUT	ACCEPTED	2026-03-22 12:40:01.318	2026-03-22 14:40:01.32	55.0302	82.9204	7	9	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-22 14:40:01.32
a4ed0298-1f08-460b-80ce-01ec6790d635	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	CHECK_IN	ACCEPTED	2026-03-24 04:13:39.737	2026-03-24 08:13:39.739	55.0302	82.9204	6	10	Seeded break shift	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-24 08:13:39.739
96437d94-9f0d-4b70-8fce-003ab98986e5	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	BREAK_START	ACCEPTED	2026-03-24 06:13:39.74	2026-03-24 08:13:39.741	55.0302	82.9204	6	14	Seeded long break	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-24 08:13:39.741
65168310-7069-4707-ae39-b70b75ef8b14	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_IN	ACCEPTED	2026-03-24 02:13:39.745	2026-03-24 08:13:39.746	55.0302	82.9204	7	11	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-24 08:13:39.746
30b91a29-4b49-4b17-8d57-b5980f22d179	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_OUT	ACCEPTED	2026-03-24 06:13:39.746	2026-03-24 08:13:39.747	55.0302	82.9204	7	9	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-24 08:13:39.747
b142e56d-5598-4f04-971f-8ea5b5ef884d	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	CHECK_IN	ACCEPTED	2026-03-26 01:35:09.159	2026-03-26 05:35:09.16	55.0302	82.9204	6	10	Seeded break shift	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-26 05:35:09.16
0bcc1771-3e76-4167-9b33-ea1e513936e1	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	BREAK_START	ACCEPTED	2026-03-26 03:35:09.161	2026-03-26 05:35:09.163	55.0302	82.9204	6	14	Seeded long break	9273eef7-628d-4b05-be13-8136d070eb0a	677fe271-83e1-43d4-babc-6afbfab08f4d	2026-03-26 05:35:09.163
dd6fc5ed-d57d-49a8-849d-b974e1afdc55	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_IN	ACCEPTED	2026-03-25 23:35:09.165	2026-03-26 05:35:09.167	55.0302	82.9204	7	11	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-26 05:35:09.167
029a9f55-3951-4814-aac7-baa6a57755aa	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	CHECK_OUT	ACCEPTED	2026-03-26 03:35:09.166	2026-03-26 05:35:09.168	55.0302	82.9204	7	9	Seeded early leave	9273eef7-628d-4b05-be13-8136d070eb0a	7e3acdc1-23d6-45a7-8309-ad09df3d9969	2026-03-26 05:35:09.168
\.


--
-- Data for Name: AttendanceSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceSession" (id, "tenantId", "employeeId", "checkInEventId", "checkOutEventId", status, "startedAt", "endedAt", "totalMinutes", "lateMinutes", "earlyLeaveMinutes", "breakMinutes", "createdAt", "updatedAt", "shiftId", "paidBreakMinutes") FROM stdin;
b51c4f45-7aac-41f6-b40d-0a6ce3b691d6	f8874b2f-0678-4953-b992-d9ab45835109	cfb108b5-d63f-4680-ac17-6e0115f66405	2fb08d4a-a2c6-4f36-8871-149dab0b7c1f	\N	OPEN	2026-03-12 06:16:23.501	\N	120	15	0	0	2026-03-12 08:16:23.505	2026-03-12 08:16:23.505	218a4a18-0040-42dc-9e09-6f9dd122366c	0
27cc4df9-9224-4f11-a8e7-d4fdbc605ffc	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	15fabb92-1fc4-41b3-9e31-e3a024ab7728	\N	ON_BREAK	2026-03-12 04:16:23.506	\N	240	0	0	0	2026-03-12 08:16:23.509	2026-03-12 08:16:23.509	ffc1b01b-e0a5-4bf1-93f0-e1bab5ea4780	0
d24aa3f4-268e-4060-82ff-05e157142140	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	8d56b3d8-1e1e-4800-9b5a-78b5b97740c3	4cc652ce-afdb-4957-a62c-4a288bb2b2bf	CLOSED	2026-03-12 02:16:23.51	2026-03-12 06:16:23.511	240	0	35	0	2026-03-12 08:16:23.514	2026-03-12 08:16:23.514	95fcb40d-0725-4921-9d7d-40f7ad422d51	0
b3ac8e72-3870-40b3-ab94-c29629bff3fc	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	82630474-8e71-4fb7-8128-e77889a0333f	\N	ON_BREAK	2026-03-22 10:40:01.309	\N	240	0	0	0	2026-03-22 14:40:01.314	2026-03-22 14:40:01.314	f7988583-8287-4c86-a872-705742cd17d9	0
1fe56659-aef7-450a-84ed-19eb0e597675	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	e20f9e9e-7a57-453b-a1cb-eb0daf0ddd09	a2d3e702-ea16-4e27-9255-5792d5539f3e	CLOSED	2026-03-22 08:40:01.316	2026-03-22 12:40:01.318	240	0	35	0	2026-03-22 14:40:01.321	2026-03-22 14:40:01.321	0acac97c-5574-460f-afcb-9ae0b9ffa5a4	0
1fc970c4-83d4-46bc-b8dd-edf77c980892	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	a4ed0298-1f08-460b-80ce-01ec6790d635	\N	ON_BREAK	2026-03-24 04:13:39.737	\N	240	0	0	0	2026-03-24 08:13:39.742	2026-03-24 08:13:39.742	facd9a1a-fe5a-48d4-8fb9-97b6769312b5	0
8666c26e-096c-424e-abcc-20f34fd4f3a1	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	65168310-7069-4707-ae39-b70b75ef8b14	30b91a29-4b49-4b17-8d57-b5980f22d179	CLOSED	2026-03-24 02:13:39.745	2026-03-24 06:13:39.746	240	0	35	0	2026-03-24 08:13:39.748	2026-03-24 08:13:39.748	96761456-5d24-4b11-9bc4-636b5ee4a082	0
63454788-01c3-48c7-8ceb-ffb486c9a405	f8874b2f-0678-4953-b992-d9ab45835109	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	b142e56d-5598-4f04-971f-8ea5b5ef884d	\N	ON_BREAK	2026-03-26 01:35:09.159	\N	240	0	0	0	2026-03-26 05:35:09.164	2026-03-26 05:35:09.164	b75008f0-054d-4471-ac77-dadf33846133	0
d419a2f1-6af0-45ca-b269-d9e1ddd5f1e6	f8874b2f-0678-4953-b992-d9ab45835109	efa60105-a29a-4668-a5fc-83f106fae8c6	dd6fc5ed-d57d-49a8-849d-b974e1afdc55	029a9f55-3951-4814-aac7-baa6a57755aa	CLOSED	2026-03-25 23:35:09.165	2026-03-26 03:35:09.166	240	0	35	0	2026-03-26 05:35:09.168	2026-03-26 05:35:09.168	326ce630-1ee3-43a6-90f0-4372646e5073	0
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "tenantId", "actorUserId", "entityType", "entityId", action, "metadataJson", "createdAt") FROM stdin;
c49d1dde-9a0d-4b61-b5b5-4840788a2c59	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	session	587a860f-b3ad-4748-b663-330bef759b71	auth.login	{"email":"owner@demo.smart","roleCodes":["tenant_owner"]}	2026-03-07 06:21:31.911
ee678812-7196-485a-a630-f98ee036a6bf	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	session	587a860f-b3ad-4748-b663-330bef759b71	auth.login	{"email":"owner@demo.smart","roleCodes":["tenant_owner"]}	2026-03-09 08:33:23.311
3d6ea16b-d8b4-4674-b22f-abd53f979095	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	session	587a860f-b3ad-4748-b663-330bef759b71	auth.login	{"email":"owner@demo.smart","roleCodes":["tenant_owner"]}	2026-03-09 10:50:16.536
6f906b8f-d77c-4eff-842a-c44f740be34b	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	session	587a860f-b3ad-4748-b663-330bef759b71	auth.login	{"email":"owner@demo.smart","roleCodes":["tenant_owner"]}	2026-03-10 14:39:30.734
6ca75e83-487b-41b6-9903-39ce8053b326	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	session	587a860f-b3ad-4748-b663-330bef759b71	auth.login	{"email":"owner@demo.smart","roleCodes":["tenant_owner"]}	2026-03-10 14:41:07.987
f12540ac-60b2-41a8-8f7c-8d4e68f05842	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	employee_invitation	f92ef392-78d0-41d8-9ad4-5b63f3327ad3	employee.invitation_created	{"email":"new.worker@example.com","expiresAt":"2026-03-13T14:41:08.020Z","provider":"log"}	2026-03-10 14:41:08.038
42103073-dc83-4c27-a223-6fdb422fb99f	f8874b2f-0678-4953-b992-d9ab45835109	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	session	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	auth.login	{"email":"new.worker@example.com","roleCodes":["employee"]}	2026-03-10 14:41:32.76
5051d9fe-619e-4646-979a-b796ea58a1a3	f8874b2f-0678-4953-b992-d9ab45835109	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	session	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	auth.login	{"email":"new.worker@example.com","roleCodes":["employee"]}	2026-03-10 14:44:52.667
cec7dd56-5722-401c-9aff-e8baaabe8667	f8874b2f-0678-4953-b992-d9ab45835109	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	session	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	auth.login	{"email":"new.worker@example.com","roleCodes":["employee"]}	2026-03-10 14:44:52.816
acb6d2a1-14d7-4bf8-b72a-9bcdce347a9d	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	session	587a860f-b3ad-4748-b663-330bef759b71	auth.login	{"email":"owner@demo.smart","roleCodes":["tenant_owner"]}	2026-03-10 14:44:52.896
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

COPY public."BiometricVerification" (id, "employeeId", "attendanceEventId", result, "livenessScore", "matchScore", "reviewReason", "capturedAt", provider, "createdAt", "manualReviewStatus", "reviewedAt", "reviewerComment", "reviewerEmployeeId") FROM stdin;
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

COPY public."Company" (id, "tenantId", name, code, "createdAt", "updatedAt", "googlePlaceId", "logoUrl") FROM stdin;
f00f400b-3623-4211-a477-cc596d10a115	f8874b2f-0678-4953-b992-d9ab45835109	Demo HQ	DEMO-HQ	2026-03-07 06:14:03.962	2026-03-07 06:14:03.962	\N	\N
0101e06d-1dd3-46b5-9313-2cdee01dc689	f8874b2f-0678-4953-b992-d9ab45835109	Beauty Life	BEAUTY-HQ	2026-03-12 08:16:23.403	2026-03-26 05:35:09.026	\N	\N
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Department" (id, "tenantId", name, code, "parentDepartmentId", "createdAt", "updatedAt") FROM stdin;
a1e61d61-ca4f-4fc4-8f40-9bb066ac77a9	f8874b2f-0678-4953-b992-d9ab45835109	Operations	OPS	\N	2026-03-07 06:14:03.965	2026-03-07 06:14:03.965
3da9c95d-e428-4f4b-9a68-59d828f389e9	f8874b2f-0678-4953-b992-d9ab45835109	Front Desk	FRONT	\N	2026-03-12 08:16:23.414	2026-03-12 08:16:23.414
\.


--
-- Data for Name: Device; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Device" (id, "employeeId", platform, "deviceFingerprint", "deviceName", "isPrimary", "createdAt", "updatedAt") FROM stdin;
a83df2e4-2642-41fd-944d-7ba4730ec474	359ca1a4-307d-4005-832f-0d6a408866aa	WEB	demo-device	Demo Browser	t	2026-03-07 06:14:03.982	2026-03-08 05:28:24.982
1f7253b9-d73f-40a6-b7a6-9be5ce5fa399	359ca1a4-307d-4005-832f-0d6a408866aa	WEB	demo-device-owner	Owner Browser	t	2026-03-12 08:16:23.436	2026-03-26 05:35:09.078
0215f91e-b5c8-4a62-87bb-c5e5ad31c16c	cfb108b5-d63f-4680-ac17-6e0115f66405	WEB	demo-device-alex	Alex Browser	t	2026-03-12 08:16:23.445	2026-03-26 05:35:09.086
074648f9-cfcd-4e70-b0e4-9a64d83e48bb	6f4a23c3-8061-48e2-b6fe-5587c48b2a72	WEB	demo-device-manager	Manager Browser	t	2026-03-24 08:13:39.639	2026-03-26 05:35:09.091
899bc2ba-a72c-4ea7-b3f5-f6180334d59e	e4dd856f-8747-4df7-897f-f2ada2579795	WEB	demo-device-julia	Julia Browser	t	2026-03-12 08:16:23.452	2026-03-26 05:35:09.095
7e3acdc1-23d6-45a7-8309-ad09df3d9969	efa60105-a29a-4668-a5fc-83f106fae8c6	WEB	demo-device-sergey	Sergey Browser	t	2026-03-12 08:16:23.456	2026-03-26 05:35:09.1
677fe271-83e1-43d4-babc-6afbfab08f4d	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	WEB	demo-device-maria	Maria Browser	t	2026-03-12 08:16:23.461	2026-03-26 05:35:09.104
\.


--
-- Data for Name: DiagnosticsPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DiagnosticsPolicy" (id, "tenantId", "exportQueueWarningMinutes", "exportQueueCriticalMinutes", "biometricQueueWarningMinutes", "biometricQueueCriticalMinutes", "exportFailureWarningCount24h", "biometricFailureWarningCount24h", "pushFailureCriticalCount24h", "pushReceiptErrorCriticalCount", "criticalAnomaliesCriticalCount", "pendingBiometricReviewWarningCount", "repeatIntervalMinutes", "notifyTenantOwner", "notifyHrAdmin", "notifyOperationsAdmin", "notifyManagers", "createdAt", "updatedAt") FROM stdin;
a354337e-61a8-4356-8a33-0c3676498341	f8874b2f-0678-4953-b992-d9ab45835109	10	20	10	20	1	1	1	1	1	1	60	t	t	t	f	2026-03-08 14:35:00.097	2026-03-08 14:35:00.097
\.


--
-- Data for Name: DiagnosticsSnapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DiagnosticsSnapshot" (id, "tenantId", "exportQueued", "exportProcessing", "exportFailed", "exportCompleted", "exportOldestQueuedMinutes", "biometricQueued", "biometricProcessing", "biometricFailed", "biometricCompleted", "biometricOldestQueuedMinutes", "pushQueued", "pushProcessing", "pushFailed", "pushDelivered", "pushPendingReceipts", "pushReceiptErrors", "criticalAnomaliesToday", "pendingBiometricReviews", "exportFailures24h", "biometricFailures24h", "pushFailures24h", "criticalAlerts", "warningAlerts", "capturedAt") FROM stdin;
daf4a6d2-77f7-4a1a-9597-f0529a203a29	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-08 14:35:00.338
24ec8ca8-7631-4c9e-be0e-58caefad3116	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-08 14:50:00.291
940a1a5f-3430-47d1-bd3e-dd8c2730112e	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-08 15:05:00.071
d29d7d82-8dea-4623-87b9-f9f0f2cf4def	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-08 15:20:00.277
34d3e1a1-82cc-4632-ae3e-674e3a468ec8	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 04:05:00.224
9e738f7f-8253-4cb3-88e1-e74d79cae01d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 04:20:00.187
f6cabe5f-d9de-4edd-9e2e-a2ab111fe22d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 04:35:00.024
9a14d6e6-0b7a-4720-a98f-a2e9027f91da	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 04:50:00.253
2ca9aaef-e1cd-465d-82de-f005d8d08189	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 05:05:00.026
ad2c62d5-ff1a-4192-96f3-27692c87df2f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 05:20:00.256
92b23e33-86fd-41f5-ba8d-8541b099dbd6	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 05:35:00.025
4aec2baf-2495-4cb5-9399-ace10b1c6c4e	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 05:50:00.183
42742b08-02ed-42bd-8b26-4f92344c940d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 06:05:00.24
79124e1f-af85-453e-9d93-c50233c1c67b	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 06:20:00.218
8131544a-6175-4bc7-8adf-465dfbb135bc	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 07:47:18.067
bb6e6b69-e5bb-44d8-86b0-3ce9df909226	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 07:50:00.032
92c0f466-d131-4c2d-bad3-f0981938c7ce	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 08:05:00.027
8ad419f3-07ed-441d-a0de-a571d644a6a5	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 08:20:00.161
97771405-b88f-4ff3-89d9-9ea6df5f9118	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 08:35:00.03
d12c49df-1146-4752-ab0e-6db531f1aef3	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 08:50:00.211
60f88883-bf4e-432f-9504-a78baadb2695	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 09:05:00.037
4057be01-7199-4161-976d-6bef24b0dc6f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 09:20:00.169
57675615-d4b7-45fa-9daa-1960fd59cccc	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 09:35:00.03
eca39786-fd01-45e9-9107-454601c1c5da	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 09:50:00.299
ef110a05-be07-4753-8150-abccc9a20b82	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 10:05:00.029
56337ee7-c53e-4fdc-91ca-ad9e032ae66f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 10:20:00.31
569f8213-01ef-41d7-b61e-75f9d549a056	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 10:35:00.062
3c9ea538-40bb-4651-8607-083791d252bb	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 10:50:00.255
5d4eed9f-e00b-4bec-b289-055664a61c3f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 11:05:00.07
52cf9750-08f7-4ed0-8b6e-133d17b364de	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 11:20:00.205
7b71f367-326e-494e-92de-d01d5dc1b63f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 11:35:00.033
e5b6bafd-895e-4984-bbe7-81ed19d4e629	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 11:50:00.182
62843781-1be0-4fd0-ad70-ee357de9cdba	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 12:05:00.03
44f7bdc3-2490-49f4-95ef-facddbb2ac4c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 12:20:00.174
c5ef2df3-905e-46ac-9d19-21692afa0df0	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 12:35:00.037
ae4b46cd-6442-4fbb-85eb-613140817e9b	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 12:50:00.273
ee29f3d0-b866-4a00-b4ee-fed797319835	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 13:05:00.101
4ed27456-c720-4d9f-95d9-a5c6953dc97b	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 13:20:00.184
43715c22-7b00-4058-bab2-37878e28bf6c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 13:35:00.057
7189c5cc-abd9-454d-8809-72e567fd66ca	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 13:50:00.187
dda7b845-589b-4a1a-8ecd-a85f5fe5724d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 14:05:00.048
479f3292-b460-44b9-888d-9ef488add01d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 14:20:00.368
797deddc-7c04-485e-ab64-35fb1ee3756d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 14:35:00.046
e9f981be-8a61-413f-add1-aaec0c19301c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 14:50:00.26
01e28faa-291b-446a-9d04-78be2b7889ee	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 15:05:00.215
9860055e-e4f3-4580-bab9-52d5f0102aae	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 15:20:00.243
70dfabeb-e94c-4d1e-82a8-908e178ec087	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 15:35:00.161
bd96634c-c78e-4b63-8e17-97a05eb3644f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 15:50:00.13
c58e9888-52da-4297-9750-315b5a4f9256	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 16:05:00.165
f82e032d-18a5-413f-b8f7-1a0166607d19	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 16:20:00.153
839c5256-ecc4-4e11-9123-115b684f2e1d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 16:35:00.063
87947c8a-beb1-4873-b001-afe1f59975b5	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-09 16:50:00.194
f07f0674-4761-4493-8d16-e03290fe668c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 03:50:00.144
50942c1c-3ef7-463d-bc5b-dc26de07e553	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 04:05:00.029
681ab1e2-610f-450c-b293-121d10e1320d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 04:20:00.154
3f9b92a3-d1a4-4b4a-a8bf-4a343e09382c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 04:35:00.027
b3cb3a61-b1c5-4480-a015-e8426239cecc	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 04:50:00.207
e632b728-8d97-4316-92ec-f15546a227b5	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 05:05:00.021
5703532a-f9ab-46d4-bcfd-a72b1fc0d720	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 05:20:00.153
72f2bfde-951f-4b34-b81d-ef226f7878a2	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 05:35:00.018
a66115db-bb17-4f9b-b06f-50ed9ca6e191	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 05:50:00.156
303ec2af-452c-45fb-b4c9-e8790a68fbda	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 06:05:00.018
57c0f5bb-3f9d-4087-bda4-e24794b55264	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 06:20:00.163
bc1625a1-39a5-45fe-8b40-2ce8beac97b4	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 06:35:00.03
89475ea1-8f06-4259-a58a-34452b1c04d1	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 06:50:00.155
9a9f9c12-66a3-466e-96de-e13a01104553	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 07:05:00.022
f6ddf2a2-8b24-479a-9bf1-c6af5920911f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 07:20:00.15
3bf083e0-595c-4e43-ba0c-2f83f11ec2d4	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 07:35:00.022
699f7ed9-c0bc-4e5e-9ea1-cb2b413c6da5	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 07:50:00.153
30f74792-3b80-460a-916b-bd69a3dd5c67	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 08:20:00.17
f0f068ad-2ff5-4315-aed3-4949f9d61cbd	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 08:35:00.307
aa5764ca-d03d-4718-ab58-aeeae3cd5e23	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 08:50:00.237
ebf088a0-e2b4-445e-81b0-81f36a6691b8	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 09:05:00.265
3c0a20cf-e984-4fc4-971d-119bbc132e3d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 09:20:00.163
2a525d8b-72b1-4811-ad73-1fbead853e87	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 09:35:00.039
3529f084-4e19-49cb-a23b-0fd0bb03fb63	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 09:50:00.15
eb72f17d-322a-4ece-abde-bf84e6511b08	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 10:05:00.033
4af10833-8716-4ef1-ab44-e16ea38d00c7	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 10:20:00.17
5b4718fa-dc76-4c2c-b40b-d41c7355dc3a	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 10:35:00.041
4a1f6de8-0609-45f9-9987-1dcc802ead6a	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 10:50:00.218
30f14a35-a317-4b70-840f-6cc2802c4b9d	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 11:05:00.027
00e7e499-ea53-48dc-82d7-0509ef874a69	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 11:20:00.237
34bee881-0820-4464-8015-fef6d334679c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 11:35:00.023
d894a01b-d1cd-4878-b280-239ffa850d82	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 11:50:00.218
516a46b6-a3d5-444d-92a5-07660b0212d7	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 12:05:00.042
adea3082-b48b-4a1f-872d-a319ee4ee235	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 12:20:00.268
97a75b76-0ef2-4e3e-bc13-d3ffb4cc1055	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 12:35:00.037
750b3fe5-352a-46de-9b9b-2a96339646d6	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 12:50:00.214
af75f142-fb18-4793-af1a-af328806530f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 13:05:00.096
60413e9f-eb62-43f2-9fe4-1953ddc4c929	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 13:20:00.239
64a32112-1479-49ba-8aa0-68bb2861c091	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 13:35:00.075
367e207e-bb67-47b3-9f52-6d1be72b8e47	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 13:50:00.287
cc5969ec-8715-4dbd-8989-cc181c0f970e	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 14:05:00.063
9c258282-47db-407a-b852-7f06c4f378ee	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 14:20:00.167
8da44332-12ee-46fa-83c6-85cd310b1e61	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	0	2026-03-10 14:35:00.047
671cec97-7183-4366-be64-83dc7580e687	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 14:50:00.206
e9c2b559-6402-49bd-8706-413764a5656f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 15:05:00.043
aed2908e-1577-411a-939f-2384b60e8b18	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 15:20:00.23
793e793f-c033-458a-a960-92e125b650d9	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 15:35:00.035
db4b62e2-ff54-480f-beb2-3c5ace64c3d8	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 15:50:00.319
864f5230-dfb8-441a-a694-9953e1da3797	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 16:05:00.051
34794022-5c06-48a2-bba8-63b56d66af22	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 16:20:00.259
db7ebbe0-8d1b-4d21-b56e-38df8dcee9c1	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 16:35:00.04
b3d7324b-3ee2-4376-9be0-6bff08c28e87	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 16:50:00.17
d0dc05e8-f031-438b-b319-3666689a33f9	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 17:05:00.173
298b15e2-bb29-4da8-9aa4-92e08663f43e	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 17:20:00.296
2015be82-eac5-4617-a2f7-b150af9599e1	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 17:35:00.04
5b83c5cb-9a0c-4ee1-a525-4bc47bb7e564	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 17:50:00.258
1b12f0f1-4d29-4f6c-abcf-292b37d8da70	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-10 18:05:00.034
0fab2a22-ccb2-4794-96b3-ea57dc2f5f1e	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 04:20:00.27
c573837e-085b-4313-91a7-a8d5d7492bf8	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 04:35:00.077
4703b7cf-3d03-47f4-90fc-3b09721c95e4	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 04:50:00.154
7b2f22f1-e9fa-4af0-8380-928d3d0f27c1	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 05:05:00.031
690c6df7-9668-420d-bab9-04b585e54c21	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 05:20:00.18
4c65eca6-bc64-4d03-bf1a-644bdc1d0150	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 05:35:00.029
65061d04-81aa-4bb0-9aa2-7a60ec3c03f4	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 05:50:00.212
d6583e9b-b700-4994-af29-bfee24ad57fa	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 06:05:00.025
3964239d-c789-46bf-9fd5-71589755831c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 06:20:00.154
5e567872-fa13-407c-a9a0-7b6f7d8eb103	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 06:35:00.104
b4fab32e-6eac-4d77-9365-3819f0b7bd79	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 06:50:00.241
3e73badd-0788-4817-9548-587334e3f42b	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 07:05:00.037
b3233ff2-25b3-4a08-9ae0-489a968562bc	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 07:20:00.247
61e68361-0c2e-4260-99ac-96320665bfbf	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 07:35:00.027
3cf2fad9-d7c0-4553-af1e-c7ca1f76482c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 07:50:00.25
615fa9e9-dcf0-40ce-9e2d-66d3f1807f18	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 08:05:00.185
737bc8c9-d1dd-4fe8-b9ae-d379d8299656	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 08:20:00.301
6deeaa42-0669-4c07-8321-be504c3f06c9	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 08:35:00.092
dd91f170-03fd-4a57-9715-becb3a012f8e	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 08:50:00.225
eac5df14-860a-430a-b024-b90f20708d55	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 09:05:00.071
e3eb84c8-d119-476e-9291-4a1e32878fb0	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 09:20:00.202
9ed0efbf-2486-48e3-a501-f1859aecd4af	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 09:35:00.045
8c3d8b20-3911-4d46-ac22-dcf92bd38c7b	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 09:50:00.231
9ac688eb-2ef4-4c08-aa3b-c4e5a7a864b1	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 10:05:00.224
5ad378f2-5af2-4703-b851-544765cba928	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 10:20:00.234
1170a2ae-68b0-49c8-9f89-757f7069a7d8	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 10:35:00.074
80e8bcec-6626-4b3a-a9d3-5e42982425e8	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 10:50:00.16
f458cc68-fa8d-489e-990f-78818f62a702	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 11:05:00.159
2c099d08-fcd9-4f4e-810a-aae7e78c42e7	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 11:20:00.165
656326b7-fce9-4f35-94a7-4da35b3ed9d0	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 11:35:00.031
8998d398-3b27-44f7-b9d2-4035332c83f2	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 11:50:00.227
d1dd9f50-e95d-4358-9228-1332ce0d5937	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 12:05:00.032
cd1697dd-13ee-45e8-bc78-1a686a9783b1	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 12:20:00.18
09f788be-f4ee-437e-9a0d-8b280e6c513b	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 12:35:00.033
9b3d5e4f-61c8-4faa-8963-090a07738dc5	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 12:50:00.202
0003abb2-6fc7-474d-b663-31e3170ee8f3	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 13:05:00.087
01e679d0-41e1-4d63-bd32-6a76f3689b7a	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 13:20:00.273
e1e1d342-6d6e-4b77-b739-22ea5bbcf14f	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 13:35:00.142
4c40b4ae-b0a9-41bd-b936-c08f2204efe9	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 13:50:00.15
e46cae20-3bb0-4e33-9af0-eeb142e636fe	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 14:05:00.074
9ee76999-d1d1-44d3-8900-ff9edc9b5464	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 14:20:00.342
79f0f05a-cb2f-40af-9f82-3f3e1f579a24	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 14:35:00.046
ade0e830-9894-4999-b4e3-5e6e1300813e	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 14:50:00.255
2b8d92ee-5a35-4f80-801e-908508399a99	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 15:05:00.048
3196c210-f496-4ec9-a840-1b5cd5a1cac6	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-11 15:20:00.248
05e42558-52d4-410a-a0f1-6db2212d14f5	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	0	1	0	0	0	0	0	0	0	0	2026-03-12 08:20:00.234
cb48c0a2-20ef-4cc0-9aec-949dae366f6c	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	5	1	0	0	0	0	0	0	0	0	2026-03-12 08:35:00.219
47e9fcef-9935-4170-83e1-93aecafb7621	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	5	1	0	0	0	0	0	0	0	0	2026-03-12 08:50:00.151
05d760de-daeb-4fd3-aeb9-0d5411f2aa2b	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	5	1	0	0	0	0	0	0	0	0	2026-03-12 09:05:00.027
b44d5ba9-3931-492d-91c5-7a581f50e1e4	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	5	1	0	0	0	0	0	0	0	0	2026-03-12 09:20:00.172
07cea587-6fc9-45df-a0a6-1d1b2f8bee93	f8874b2f-0678-4953-b992-d9ab45835109	0	0	0	0	0	0	0	0	0	0	1	0	0	5	1	0	0	0	0	0	0	0	0	2026-03-12 09:35:00.041
\.


--
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Employee" (id, "tenantId", "userId", "companyId", "departmentId", "primaryLocationId", "positionId", "managerEmployeeId", "employeeNumber", "firstName", "lastName", "middleName", status, "hireDate", "createdAt", "updatedAt", "birthDate", "avatarStorageKey", "avatarUrl", gender, phone) FROM stdin;
359ca1a4-307d-4005-832f-0d6a408866aa	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	0101e06d-1dd3-46b5-9313-2cdee01dc689	a1e61d61-ca4f-4fc4-8f40-9bb066ac77a9	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	\N	EMP-0001	Ilia	Admin	\N	ACTIVE	2026-01-01 00:00:00	2026-03-07 06:14:03.978	2026-03-26 05:35:09.075	1990-03-28 04:00:00	\N	\N	\N	\N
cfb108b5-d63f-4680-ac17-6e0115f66405	f8874b2f-0678-4953-b992-d9ab45835109	453467d9-f6a0-47ba-af58-7ced123b3e49	0101e06d-1dd3-46b5-9313-2cdee01dc689	a1e61d61-ca4f-4fc4-8f40-9bb066ac77a9	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	359ca1a4-307d-4005-832f-0d6a408866aa	EMP-0002	Alexander	Prokhorov	\N	ACTIVE	2026-01-05 00:00:00	2026-03-07 06:51:23.707	2026-03-26 05:35:09.085	1994-04-03 05:00:00	\N	\N	\N	\N
6f4a23c3-8061-48e2-b6fe-5587c48b2a72	f8874b2f-0678-4953-b992-d9ab45835109	d709a25a-44c1-47dd-8dc3-770f35545282	0101e06d-1dd3-46b5-9313-2cdee01dc689	a1e61d61-ca4f-4fc4-8f40-9bb066ac77a9	9273eef7-628d-4b05-be13-8136d070eb0a	ecf6caef-1f7d-41cb-8fd6-07f81351e778	359ca1a4-307d-4005-832f-0d6a408866aa	EMP-0006	Anna	Manager	\N	ACTIVE	2026-01-09 00:00:00	2026-03-24 08:13:39.626	2026-03-26 05:35:09.089	1992-04-07 04:00:00	\N	\N	\N	\N
e4dd856f-8747-4df7-897f-f2ada2579795	f8874b2f-0678-4953-b992-d9ab45835109	b97acdfc-25f0-4a0e-a65d-0051ece8a784	0101e06d-1dd3-46b5-9313-2cdee01dc689	3da9c95d-e428-4f4b-9a68-59d828f389e9	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	359ca1a4-307d-4005-832f-0d6a408866aa	EMP-0003	Julia	Zakharova	\N	ACTIVE	2026-01-12 00:00:00	2026-03-12 08:16:23.449	2026-03-26 05:35:09.094	1996-04-10 05:00:00	\N	\N	\N	\N
efa60105-a29a-4668-a5fc-83f106fae8c6	f8874b2f-0678-4953-b992-d9ab45835109	33c6251d-1ae0-4292-8930-1db25664cd3e	0101e06d-1dd3-46b5-9313-2cdee01dc689	a1e61d61-ca4f-4fc4-8f40-9bb066ac77a9	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	359ca1a4-307d-4005-832f-0d6a408866aa	EMP-0004	Sergey	Ivanov	\N	ACTIVE	2026-01-20 00:00:00	2026-03-12 08:16:23.455	2026-03-26 05:35:09.098	1991-04-23 05:00:00	\N	\N	\N	\N
b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	f8874b2f-0678-4953-b992-d9ab45835109	5e1885d8-5ead-4c1b-bc19-45131883a356	0101e06d-1dd3-46b5-9313-2cdee01dc689	3da9c95d-e428-4f4b-9a68-59d828f389e9	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	359ca1a4-307d-4005-832f-0d6a408866aa	EMP-0005	Maria	Kim	\N	ACTIVE	2026-02-01 00:00:00	2026-03-12 08:16:23.46	2026-03-26 05:35:09.103	1993-05-06 04:00:00	\N	\N	\N	\N
\.


--
-- Data for Name: EmployeeInvitation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeInvitation" (id, "tenantId", email, "invitedByUserId", "userId", "approvedByUserId", "employeeId", status, "tokenHash", "expiresAt", "invitedAt", "lastSentAt", "resentCount", "submittedAt", "approvedAt", "rejectedAt", "rejectedReason", "firstName", "lastName", "middleName", "birthDate", gender, phone, "avatarStorageKey", "avatarUrl", "createdAt", "updatedAt", "approvedGroupId", "approvedShiftTemplateId", "companyId") FROM stdin;
f92ef392-78d0-41d8-9ad4-5b63f3327ad3	f8874b2f-0678-4953-b992-d9ab45835109	new.worker@example.com	587a860f-b3ad-4748-b663-330bef759b71	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	\N	\N	PENDING_APPROVAL	675bd50a8c83d60a296ae16ba43c706c3e0e8a5299682d6fda61cb7ded4dad3d	2026-03-13 14:41:08.02	2026-03-10 14:41:08.022	2026-03-10 14:41:08.022	0	2026-03-10 14:41:32.621	\N	\N	\N	Новый	Сотрудник	Тестович	1995-01-15 00:00:00	male	+79001234567	\N	\N	2026-03-10 14:41:08.022	2026-03-10 14:41:32.623	\N	\N	\N
\.


--
-- Data for Name: EmployeeRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeRequest" (id, "tenantId", "employeeId", "managerEmployeeId", "requestType", status, title, reason, "startsOn", "endsOn", "requestedDays", "currentStep", "finalDecisionAt", "createdAt", "updatedAt", "relatedRequestId", "requestContextJson") FROM stdin;
d1d91ad2-a5f6-41b6-96b2-da7fb8af1799	f8874b2f-0678-4953-b992-d9ab45835109	cfb108b5-d63f-4680-ac17-6e0115f66405	359ca1a4-307d-4005-832f-0d6a408866aa	SUPPLY	PENDING	Supply request for consumables	Need signed purchase package for gloves and salon supplies.	2026-03-26 05:35:09.253	2026-03-27 05:35:09.253	1	1	\N	2026-03-26 05:35:09.255	2026-03-26 05:35:09.255	\N	\N
06362c16-4997-4d60-984c-49a0f185ab0b	f8874b2f-0678-4953-b992-d9ab45835109	e4dd856f-8747-4df7-897f-f2ada2579795	359ca1a4-307d-4005-832f-0d6a408866aa	LEAVE	PENDING	Leave request for next week	Need approval for family travel from Monday to Wednesday.	2026-04-02 05:35:09.258	2026-04-04 05:35:09.258	3	1	\N	2026-03-26 05:35:09.259	2026-03-26 05:35:09.259	\N	\N
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
a2804169-d720-41df-9a31-9cb002c28c4c	f8874b2f-0678-4953-b992-d9ab45835109	Women's Day	2026-03-08 00:00:00	t	2026-03-07 08:29:34.333	2026-03-26 05:35:09.114
\.


--
-- Data for Name: Location; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Location" (id, "tenantId", "companyId", name, code, address, latitude, longitude, "geofenceRadiusMeters", timezone, "createdAt", "updatedAt") FROM stdin;
9273eef7-628d-4b05-be13-8136d070eb0a	f8874b2f-0678-4953-b992-d9ab45835109	0101e06d-1dd3-46b5-9313-2cdee01dc689	Central Studio	HQ	Demo address	55.0302	82.9204	120	Asia/Novosibirsk	2026-03-07 06:14:03.97	2026-03-26 05:35:09.045
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "tenantId", "userId", type, title, body, "actionUrl", "isRead", "readAt", "metadataJson", "createdAt", "updatedAt") FROM stdin;
33816e35-3a53-4fd1-94e0-f4ae46b14613	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	EMPLOYEE_APPROVAL_ACTION_REQUIRED	Новая заявка сотрудника ждёт подтверждения	Новый Сотрудник заполнил(а) профиль и ждёт подтверждения.	/app/employees	f	\N	{"invitationId":"f92ef392-78d0-41d8-9ad4-5b63f3327ad3","email":"new.worker@example.com"}	2026-03-10 14:41:32.627	2026-03-10 14:41:32.627
abd52d41-e710-4515-bdda-7721b4752353	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	OPERATIONS_ALERT	Reminder: Review closing checklist	Ilia Admin asked for an update.	/employee/tasks	f	\N	{"taskId":"5d7b77dd-2d51-42c3-9b9d-1c6d43379764","reminder":true,"escalation":false}	2026-03-12 08:20:00.163	2026-03-12 08:20:00.163
22e5a768-c799-4347-a221-b4f8d2455f2e	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	OPERATIONS_ALERT	Reminder: Approve document packet	Ilia Admin asked for an update.	/employee/tasks	f	\N	{"taskId":"59d5b774-ed25-438d-ba78-aeb0f700d03d","reminder":true,"escalation":false}	2026-03-12 08:20:00.232	2026-03-12 08:20:00.232
ce7b2610-b523-4f84-9a62-9ead17759d1d	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	OPERATIONS_ALERT	Reminder: Call supplier before noon	Ilia Admin asked for an update.	/employee/tasks	f	\N	{"taskId":"2601ec52-ba33-4447-bb86-42a164846d51","reminder":true,"escalation":false}	2026-03-12 08:20:00.255	2026-03-12 08:20:00.255
00c609eb-b665-4bca-9e5a-d2ccc5c5564b	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	OPERATIONS_ALERT	Reminder: Check front desk coverage	Ilia Admin asked for an update.	/employee/tasks	f	\N	{"taskId":"c7ae3581-1e0f-48cb-96d5-9a47afa7533e","reminder":true,"escalation":false}	2026-03-12 08:20:00.264	2026-03-12 08:20:00.264
2ceea3da-5d1e-4db0-8a25-71f3d6cca11c	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	OPERATIONS_ALERT	Reminder: Follow up with late arrivals	Ilia Admin asked for an update.	/employee/tasks	f	\N	{"taskId":"4e0cf8a1-cb69-404c-bffe-8c3cd0835669","reminder":true,"escalation":false}	2026-03-12 08:20:00.274	2026-03-12 08:20:00.274
e48c6b47-b30c-4487-b10a-0e35318c9985	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	REQUEST_ACTION_REQUIRED	Action required: supply package	Alexander uploaded two files that need your sign-off.	/requests	f	\N	\N	2026-03-26 05:35:09.272	2026-03-26 05:35:09.272
34dcfe59-c654-409c-a1f5-f55703a15638	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	ATTENDANCE_ANOMALY_CRITICAL	Shift issue needs attention	Julia did not check in for the active shift after the grace period.	/attendance	f	\N	\N	2026-03-26 05:35:09.272	2026-03-26 05:35:09.272
ef1e93c0-da67-4e21-86e0-682ec08bc632	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	OPERATIONS_ALERT	Three approvals still waiting	Pending requests and document actions are still open on your side.	/requests	f	\N	\N	2026-03-26 05:35:09.272	2026-03-26 05:35:09.272
\.


--
-- Data for Name: PayrollPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PayrollPolicy" (id, "tenantId", "baseHourlyRate", "overtimeMultiplier", "weekendMultiplier", "latenessPenaltyPerMinute", "earlyLeavePenaltyPerMinute", "leavePaidRatio", "sickLeavePaidRatio", "standardShiftMinutes", "createdAt", "updatedAt", "holidayMultiplier", "holidayOvertimeMultiplier", "nightPremiumMultiplier", "nightShiftEndLocal", "nightShiftStartLocal", "weekendOvertimeMultiplier", "defaultBreakIsPaid", "mandatoryBreakDurationMinutes", "mandatoryBreakThresholdMinutes", "maxBreakMinutes") FROM stdin;
9be65606-af54-40dc-8cae-662d013cd58a	f8874b2f-0678-4953-b992-d9ab45835109	15	1.5	2	0.2	0.2	1	0.8	480	2026-03-07 07:38:45.203	2026-03-07 07:38:45.203	2	3	0.2	06:00	22:00	2.5	f	30	360	60
\.


--
-- Data for Name: Position; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Position" (id, "tenantId", name, code, "createdAt", "updatedAt") FROM stdin;
197ebd8d-1221-470c-bdee-fad23818b135	f8874b2f-0678-4953-b992-d9ab45835109	Owner	OWNER	2026-03-07 06:14:03.967	2026-03-07 06:14:03.967
af7f6d2e-18fc-48f3-b8f0-d961fbde79de	f8874b2f-0678-4953-b992-d9ab45835109	Specialist	SPEC	2026-03-12 08:16:23.42	2026-03-12 08:16:23.42
ecf6caef-1f7d-41cb-8fd6-07f81351e778	f8874b2f-0678-4953-b992-d9ab45835109	Manager	MANAGER	2026-03-24 08:13:39.581	2026-03-24 08:13:39.581
\.


--
-- Data for Name: PushDelivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushDelivery" (id, "tenantId", "userId", "notificationId", provider, status, title, body, "payloadJson", "ticketsJson", "errorMessage", attempts, "deliveredAt", "createdAt", "updatedAt", "receiptStatus", "receiptsCheckedAt", "receiptsJson") FROM stdin;
b21dd7fe-1f79-405e-bc99-2ff98a807250	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	33816e35-3a53-4fd1-94e0-f4ae46b14613	EXPO	QUEUED	Новая заявка сотрудника ждёт подтверждения	Новый Сотрудник заполнил(а) профиль и ждёт подтверждения.	{"actionUrl":"/app/employees","type":"EMPLOYEE_APPROVAL_ACTION_REQUIRED","invitationId":"f92ef392-78d0-41d8-9ad4-5b63f3327ad3","email":"new.worker@example.com"}	\N	\N	0	\N	2026-03-10 14:41:32.636	2026-03-10 14:41:32.636	PENDING	\N	\N
09c610ad-aeca-4878-a5bc-a06ebbb0fda1	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	abd52d41-e710-4515-bdda-7721b4752353	EXPO	DELIVERED	Reminder: Review closing checklist	Ilia Admin asked for an update.	{"actionUrl":"/employee/tasks","type":"OPERATIONS_ALERT","taskId":"5d7b77dd-2d51-42c3-9b9d-1c6d43379764","reminder":true,"escalation":false}	[]	\N	1	2026-03-12 08:20:00.227	2026-03-12 08:20:00.192	2026-03-12 08:20:00.228	\N	\N	\N
f306f76e-e538-4547-9837-b676ca869d81	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	ce7b2610-b523-4f84-9a62-9ead17759d1d	EXPO	DELIVERED	Reminder: Call supplier before noon	Ilia Admin asked for an update.	{"actionUrl":"/employee/tasks","type":"OPERATIONS_ALERT","taskId":"2601ec52-ba33-4447-bb86-42a164846d51","reminder":true,"escalation":false}	[]	\N	1	2026-03-12 08:20:00.282	2026-03-12 08:20:00.258	2026-03-12 08:20:00.283	\N	\N	\N
ce4b3170-7d80-4e7c-a83e-654d0496da6f	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	00c609eb-b665-4bca-9e5a-d2ccc5c5564b	EXPO	DELIVERED	Reminder: Check front desk coverage	Ilia Admin asked for an update.	{"actionUrl":"/employee/tasks","type":"OPERATIONS_ALERT","taskId":"c7ae3581-1e0f-48cb-96d5-9a47afa7533e","reminder":true,"escalation":false}	[]	\N	1	2026-03-12 08:20:00.284	2026-03-12 08:20:00.267	2026-03-12 08:20:00.285	\N	\N	\N
39294a38-2f7b-4f44-a12c-e8ef6136d601	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	22e5a768-c799-4347-a221-b4f8d2455f2e	EXPO	DELIVERED	Reminder: Approve document packet	Ilia Admin asked for an update.	{"actionUrl":"/employee/tasks","type":"OPERATIONS_ALERT","taskId":"59d5b774-ed25-438d-ba78-aeb0f700d03d","reminder":true,"escalation":false}	[]	\N	1	2026-03-12 08:20:00.284	2026-03-12 08:20:00.237	2026-03-12 08:20:00.285	\N	\N	\N
96edc3d3-1ba3-4eb8-82f3-69407a3dcf25	f8874b2f-0678-4953-b992-d9ab45835109	587a860f-b3ad-4748-b663-330bef759b71	2ceea3da-5d1e-4db0-8a25-71f3d6cca11c	EXPO	DELIVERED	Reminder: Follow up with late arrivals	Ilia Admin asked for an update.	{"actionUrl":"/employee/tasks","type":"OPERATIONS_ALERT","taskId":"4e0cf8a1-cb69-404c-bffe-8c3cd0835669","reminder":true,"escalation":false}	[]	\N	1	2026-03-12 08:20:00.286	2026-03-12 08:20:00.278	2026-03-12 08:20:00.287	\N	\N	\N
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
060270dd-f4c7-41da-a245-d0b2ea6384b9	f8874b2f-0678-4953-b992-d9ab45835109	d1d91ad2-a5f6-41b6-96b2-da7fb8af1799	359ca1a4-307d-4005-832f-0d6a408866aa	1	PENDING	\N	\N	2026-03-26 05:35:09.255	2026-03-26 05:35:09.255
1578f4d0-70fd-4d76-82c5-346ba78e7a45	f8874b2f-0678-4953-b992-d9ab45835109	06362c16-4997-4d60-984c-49a0f185ab0b	359ca1a4-307d-4005-832f-0d6a408866aa	1	PENDING	\N	\N	2026-03-26 05:35:09.259	2026-03-26 05:35:09.259
\.


--
-- Data for Name: RequestAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RequestAttachment" (id, "tenantId", "requestId", "uploadedByEmployeeId", "fileName", "contentType", "sizeBytes", "storageKey", "createdAt") FROM stdin;
3b0b764e-fad5-4c27-8075-d35c4bb904e0	f8874b2f-0678-4953-b992-d9ab45835109	d1d91ad2-a5f6-41b6-96b2-da7fb8af1799	cfb108b5-d63f-4680-ac17-6e0115f66405	consumables-pack.pdf	application/pdf	248000	requests/f8874b2f-0678-4953-b992-d9ab45835109/supply/consumables-pack.pdf	2026-03-26 05:35:09.258
5907398d-c9ea-43d3-9ab1-be4c6b6d75b0	f8874b2f-0678-4953-b992-d9ab45835109	d1d91ad2-a5f6-41b6-96b2-da7fb8af1799	cfb108b5-d63f-4680-ac17-6e0115f66405	invoice-draft.pdf	application/pdf	196000	requests/f8874b2f-0678-4953-b992-d9ab45835109/supply/invoice-draft.pdf	2026-03-26 05:35:09.258
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
193d59ae-99e7-4166-9639-22fc632d3591	tenant_owner	Tenant Owner	Full company access
8a1a1762-8e34-4fae-99ed-0de2ceb35325	employee	Employee	Standard employee access
8bdec431-8160-4a03-8fa2-0e8fc174c3a7	manager	Manager	Manager access for team operations
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "userId", "refreshTokenHash", "userAgent", "ipAddress", "expiresAt", "createdAt") FROM stdin;
79b3e48b-25ec-4ebe-8da3-862c688dc11f	587a860f-b3ad-4748-b663-330bef759b71	$2b$10$wglLyj7k2WqtHuFSV.twm.uzlVUDjssAyN6f0TV0cI1KkUCevL9WK	\N	\N	2026-03-14 06:21:31.907	2026-03-07 06:21:31.908
9f805556-3fa1-417e-9cc6-1a6ee3486469	587a860f-b3ad-4748-b663-330bef759b71	$2b$10$J2rNkYc1tRTdFZ3wb4b/F.LdOkjQ2uUrdQryHJ3WhxPcpLdRYSHrW	\N	\N	2026-03-16 08:33:23.295	2026-03-09 08:33:23.296
5ee8516f-51b8-4c9a-a225-a3870c6fae6b	587a860f-b3ad-4748-b663-330bef759b71	$2b$10$9nZljGpcJANlO7UjUamnsOg1/glWWJSs7rJNxQ5jMEJhla2pF7bwa	\N	\N	2026-03-16 10:50:16.532	2026-03-09 10:50:16.533
c9c4c913-cc37-4a4b-afb3-dc0b27bbc7ff	587a860f-b3ad-4748-b663-330bef759b71	$2b$10$dauy2kA64NydpURgaf9dn.fQTWw.GJZc1QQ8B5ScFZ8cH3GhhzU8i	\N	\N	2026-03-17 14:39:30.728	2026-03-10 14:39:30.729
f8362aaa-cb66-445e-bc7c-1bffc13a7dc6	587a860f-b3ad-4748-b663-330bef759b71	$2b$10$SD0NkSsmWCdOyehfdmOMNuHkDOz1Fckuh6QJ3YW1hH9IM0wvSsAKe	\N	\N	2026-03-17 14:41:07.981	2026-03-10 14:41:07.983
32ec858e-7428-4436-8e26-ecca4704cdc9	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	$2b$10$rwWdoAB3CeC0Hi8mWBCxUOwocE3DIEZ7JcWFMG.ih8Nn70PFErBnu	\N	\N	2026-03-17 14:41:32.757	2026-03-10 14:41:32.759
1bafe90f-3816-4ad7-90b1-3c48f5fe9b36	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	$2b$10$Mmew2bGuF2Evd8deK0ahKOHjd9wUxDWolPKwGMNn0ff.TAXe2WS.O	\N	\N	2026-03-17 14:44:52.665	2026-03-10 14:44:52.666
2325e4d3-3344-405a-9d2a-209b14c82a39	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	$2b$10$K2SfZj.Vha3jV9KBHqIyRu1Yc7dVxtCckFq4wkiCqmrFnIteTQI5i	\N	\N	2026-03-17 14:44:52.812	2026-03-10 14:44:52.814
9feac853-8579-4b21-9895-60bebcb81bff	587a860f-b3ad-4748-b663-330bef759b71	$2b$10$1JoU8St4psXOh9hbXmTbbeHNAGqT/5iDGp8Orenpg7dARFXQSH7.a	\N	\N	2026-03-17 14:44:52.893	2026-03-10 14:44:52.894
\.


--
-- Data for Name: Shift; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Shift" (id, "tenantId", "templateId", "employeeId", "locationId", "positionId", "shiftDate", "startsAt", "endsAt", status, "createdAt", "updatedAt") FROM stdin;
3a7e6f17-74eb-471b-8298-87e644eef54e	f8874b2f-0678-4953-b992-d9ab45835109	a9ad34ff-e1ab-4851-b449-b16e789f9198	359ca1a4-307d-4005-832f-0d6a408866aa	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-03-06 17:00:00	2026-03-07 02:00:00	2026-03-07 11:00:00	PUBLISHED	2026-03-07 06:34:46.289	2026-03-07 06:34:46.289
9b9c9c7e-4f80-4d9b-bdc7-8cda944ba05f	f8874b2f-0678-4953-b992-d9ab45835109	a9ad34ff-e1ab-4851-b449-b16e789f9198	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-03-06 17:00:00	2026-03-07 02:00:00	2026-03-07 11:00:00	PUBLISHED	2026-03-07 06:51:23.718	2026-03-07 06:51:23.718
210e61b5-91ad-4935-a3d6-4c76daf84564	f8874b2f-0678-4953-b992-d9ab45835109	a9ad34ff-e1ab-4851-b449-b16e789f9198	359ca1a4-307d-4005-832f-0d6a408866aa	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-03-07 17:00:00	2026-03-08 02:00:00	2026-03-08 11:00:00	PUBLISHED	2026-03-08 05:26:06.574	2026-03-08 05:26:06.574
ccdb845f-629b-4b54-91e4-54cd95e25e7e	f8874b2f-0678-4953-b992-d9ab45835109	a9ad34ff-e1ab-4851-b449-b16e789f9198	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-03-07 17:00:00	2026-03-08 02:00:00	2026-03-08 11:00:00	PUBLISHED	2026-03-08 05:26:06.577	2026-03-08 05:26:06.577
218a4a18-0040-42dc-9e09-6f9dd122366c	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-11 17:00:00	2026-03-12 06:01:23.496	2026-03-12 14:16:23.496	PUBLISHED	2026-03-12 08:16:23.497	2026-03-12 08:16:23.497
ffc1b01b-e0a5-4bf1-93f0-e1bab5ea4780	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-11 17:00:00	2026-03-12 04:16:23.498	2026-03-12 12:16:23.498	PUBLISHED	2026-03-12 08:16:23.499	2026-03-12 08:16:23.499
95fcb40d-0725-4921-9d7d-40f7ad422d51	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	efa60105-a29a-4668-a5fc-83f106fae8c6	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-11 17:00:00	2026-03-12 02:16:23.499	2026-03-12 06:51:11.499	PUBLISHED	2026-03-12 08:16:23.5	2026-03-12 08:16:23.5
653b3073-fecd-4959-8a8b-5a7384608141	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	e4dd856f-8747-4df7-897f-f2ada2579795	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-11 17:00:00	2026-03-12 05:16:23.5	2026-03-12 13:16:23.5	PUBLISHED	2026-03-12 08:16:23.501	2026-03-12 08:16:23.501
20edfded-0fc1-41bf-b98c-ceaede27435a	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-21 17:00:00	2026-03-22 02:00:00	2026-03-22 11:00:00	PUBLISHED	2026-03-22 14:40:01.298	2026-03-22 14:40:01.298
f7988583-8287-4c86-a872-705742cd17d9	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-21 17:00:00	2026-03-22 01:00:00	2026-03-22 10:00:00	PUBLISHED	2026-03-22 14:40:01.305	2026-03-22 14:40:01.305
0acac97c-5574-460f-afcb-9ae0b9ffa5a4	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	efa60105-a29a-4668-a5fc-83f106fae8c6	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-21 17:00:00	2026-03-22 00:30:00	2026-03-22 09:00:00	PUBLISHED	2026-03-22 14:40:01.308	2026-03-22 14:40:01.308
8c071203-9076-412a-b083-0b112bec6001	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	e4dd856f-8747-4df7-897f-f2ada2579795	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-21 17:00:00	2026-03-22 03:00:00	2026-03-22 12:00:00	PUBLISHED	2026-03-22 14:40:01.309	2026-03-22 14:40:01.309
6e2123d8-9b13-430b-a64a-b1aaa4b9f0ae	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-23 17:00:00	2026-03-24 02:00:00	2026-03-24 11:00:00	PUBLISHED	2026-03-24 08:13:39.731	2026-03-24 08:13:39.731
facd9a1a-fe5a-48d4-8fb9-97b6769312b5	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-23 17:00:00	2026-03-24 01:00:00	2026-03-24 10:00:00	PUBLISHED	2026-03-24 08:13:39.733	2026-03-24 08:13:39.733
96761456-5d24-4b11-9bc4-636b5ee4a082	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	efa60105-a29a-4668-a5fc-83f106fae8c6	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-23 17:00:00	2026-03-24 00:30:00	2026-03-24 09:00:00	PUBLISHED	2026-03-24 08:13:39.734	2026-03-24 08:13:39.734
eddce12b-9a97-4397-898b-3d365435371d	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	e4dd856f-8747-4df7-897f-f2ada2579795	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-23 17:00:00	2026-03-24 03:00:00	2026-03-24 12:00:00	PUBLISHED	2026-03-24 08:13:39.734	2026-03-24 08:13:39.734
1c5b0987-7995-4070-8b7d-08d150521e63	f8874b2f-0678-4953-b992-d9ab45835109	d8b7eb0c-427f-4b00-b98f-c5e333fe1572	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-24 17:00:00	2026-03-25 04:00:00	2026-03-25 13:00:00	PUBLISHED	2026-03-24 08:13:39.736	2026-03-24 08:13:39.736
847a4d3f-fe56-4464-8f23-c629f45faafd	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-25 17:00:00	2026-03-26 02:00:00	2026-03-26 11:00:00	PUBLISHED	2026-03-26 05:35:09.15	2026-03-26 05:35:09.15
b75008f0-054d-4471-ac77-dadf33846133	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-25 17:00:00	2026-03-26 01:00:00	2026-03-26 10:00:00	PUBLISHED	2026-03-26 05:35:09.154	2026-03-26 05:35:09.154
326ce630-1ee3-43a6-90f0-4372646e5073	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	efa60105-a29a-4668-a5fc-83f106fae8c6	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-25 17:00:00	2026-03-26 00:30:00	2026-03-26 09:00:00	PUBLISHED	2026-03-26 05:35:09.155	2026-03-26 05:35:09.155
0080e19d-254a-47d8-b727-42e5fd0caf22	f8874b2f-0678-4953-b992-d9ab45835109	61a3cc3d-058a-4032-bad2-5458710031e6	e4dd856f-8747-4df7-897f-f2ada2579795	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-25 17:00:00	2026-03-26 03:00:00	2026-03-26 12:00:00	PUBLISHED	2026-03-26 05:35:09.156	2026-03-26 05:35:09.156
c91d742f-910e-486a-8bd6-fb2c5733cbc2	f8874b2f-0678-4953-b992-d9ab45835109	d8aa9055-cce3-41a9-8dd1-5ad6d3a1654f	359ca1a4-307d-4005-832f-0d6a408866aa	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-03-25 17:00:00	2026-03-26 02:00:00	2026-03-26 11:00:00	PUBLISHED	2026-03-26 05:35:09.157	2026-03-26 05:35:09.157
79d7dfc0-4c07-4d40-81cd-1f582cf1b298	f8874b2f-0678-4953-b992-d9ab45835109	d8b7eb0c-427f-4b00-b98f-c5e333fe1572	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-26 17:00:00	2026-03-27 04:00:00	2026-03-27 13:00:00	PUBLISHED	2026-03-26 05:35:09.157	2026-03-26 05:35:09.157
95a3f228-f9aa-486b-a208-4b84bc5bbd04	f8874b2f-0678-4953-b992-d9ab45835109	d8b7eb0c-427f-4b00-b98f-c5e333fe1572	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-28 17:00:00	2026-03-29 05:00:00	2026-03-29 14:00:00	PUBLISHED	2026-03-26 05:35:09.157	2026-03-26 05:35:09.157
73abef34-73e7-405b-8218-8c1e8c0b5181	f8874b2f-0678-4953-b992-d9ab45835109	d8b7eb0c-427f-4b00-b98f-c5e333fe1572	cfb108b5-d63f-4680-ac17-6e0115f66405	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	2026-03-31 17:00:00	2026-04-01 02:30:00	2026-04-01 11:30:00	PUBLISHED	2026-03-26 05:35:09.157	2026-03-26 05:35:09.157
081f6c92-6aae-4d8e-a223-76feec9db0b0	f8874b2f-0678-4953-b992-d9ab45835109	d8aa9055-cce3-41a9-8dd1-5ad6d3a1654f	359ca1a4-307d-4005-832f-0d6a408866aa	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-03-27 17:00:00	2026-03-28 03:00:00	2026-03-28 12:00:00	PUBLISHED	2026-03-26 05:35:09.157	2026-03-26 05:35:09.157
721c344d-9042-4606-ae73-d72da8cf7a1b	f8874b2f-0678-4953-b992-d9ab45835109	d8aa9055-cce3-41a9-8dd1-5ad6d3a1654f	359ca1a4-307d-4005-832f-0d6a408866aa	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-03-29 17:00:00	2026-03-30 02:00:00	2026-03-30 10:30:00	PUBLISHED	2026-03-26 05:35:09.157	2026-03-26 05:35:09.157
93d7b7a5-305c-4aa0-aa3e-d6cd3122daef	f8874b2f-0678-4953-b992-d9ab45835109	d8aa9055-cce3-41a9-8dd1-5ad6d3a1654f	359ca1a4-307d-4005-832f-0d6a408866aa	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	2026-04-01 17:00:00	2026-04-02 04:00:00	2026-04-02 12:00:00	PUBLISHED	2026-03-26 05:35:09.157	2026-03-26 05:35:09.157
\.


--
-- Data for Name: ShiftTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ShiftTemplate" (id, "tenantId", name, code, "locationId", "positionId", "startsAtLocal", "endsAtLocal", "gracePeriodMinutes", "createdAt", "updatedAt", "weekDaysJson") FROM stdin;
a9ad34ff-e1ab-4851-b449-b16e789f9198	f8874b2f-0678-4953-b992-d9ab45835109	Day Shift 9-18	DAY-9-18	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	09:00	18:00	10	2026-03-07 06:34:46.284	2026-03-07 06:34:46.284	\N
61a3cc3d-058a-4032-bad2-5458710031e6	f8874b2f-0678-4953-b992-d9ab45835109	Flexible Day Shift	DAY-FLEX	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	09:00	18:00	10	2026-03-12 08:16:23.473	2026-03-26 05:35:09.117	\N
d8b7eb0c-427f-4b00-b98f-c5e333fe1572	f8874b2f-0678-4953-b992-d9ab45835109	Demo Future Employee Shift	DEMO-FUTURE-EMP	9273eef7-628d-4b05-be13-8136d070eb0a	af7f6d2e-18fc-48f3-b8f0-d961fbde79de	11:00	20:00	10	2026-03-24 08:13:39.693	2026-03-26 05:35:09.119	\N
d8aa9055-cce3-41a9-8dd1-5ad6d3a1654f	f8874b2f-0678-4953-b992-d9ab45835109	Demo Future Owner Shift	DEMO-FUTURE-OWNER	9273eef7-628d-4b05-be13-8136d070eb0a	197ebd8d-1221-470c-bdee-fad23818b135	10:00	19:00	10	2026-03-24 08:13:39.697	2026-03-26 05:35:09.12	\N
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Task" (id, "tenantId", "managerEmployeeId", "assigneeEmployeeId", "groupId", title, description, status, priority, "dueAt", "completedAt", "createdAt", "updatedAt", "lastEscalatedAt", "lastReminderAt", "requiresPhoto") FROM stdin;
5d7b77dd-2d51-42c3-9b9d-1c6d43379764	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Review closing checklist	Confirm that the evening handover checklist is ready before the end of the day.	TODO	HIGH	2026-03-12 12:16:23.527	\N	2026-03-12 08:16:23.528	2026-03-12 08:20:00.156	\N	2026-03-12 08:20:00.151	f
59d5b774-ed25-438d-ba78-aeb0f700d03d	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Approve document packet	Review incoming vendor documents and sign the approved set.	IN_PROGRESS	URGENT	2026-03-12 10:16:23.532	\N	2026-03-12 08:16:23.534	2026-03-12 08:20:00.228	\N	2026-03-12 08:20:00.227	f
2601ec52-ba33-4447-bb86-42a164846d51	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Call supplier before noon	Confirm delivery timing for color materials and front desk stock.	TODO	MEDIUM	2026-03-12 09:16:23.534	\N	2026-03-12 08:16:23.536	2026-03-12 08:20:00.253	\N	2026-03-12 08:20:00.252	f
c7ae3581-1e0f-48cb-96d5-9a47afa7533e	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Check front desk coverage	Verify that reception coverage still matches late bookings.	TODO	MEDIUM	2026-03-12 11:16:23.535	\N	2026-03-12 08:16:23.537	2026-03-12 08:20:00.263	\N	2026-03-12 08:20:00.262	f
4e0cf8a1-cb69-404c-bffe-8c3cd0835669	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Follow up with late arrivals	Message employees with active attendance issues and document the reason.	TODO	HIGH	2026-03-12 13:16:23.536	\N	2026-03-12 08:16:23.537	2026-03-12 08:20:00.273	\N	2026-03-12 08:20:00.272	f
57ebd78a-5b20-439c-8591-71dd607bef8c	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Prepare two treatment rooms	Open room A and room B for the morning clients and verify that all surfaces are clean.	TODO	HIGH	2026-03-26 03:30:00	\N	2026-03-26 05:35:09.202	2026-03-26 05:35:09.202	\N	\N	f
fa1141ea-5e71-4ee4-b218-fff791fdfe16	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Restock towels and cleaning supplies	Refill the storage cart before the lunch rush so the evening shift does not run out of supplies.	TODO	URGENT	2026-03-26 05:15:00	\N	2026-03-26 05:35:09.221	2026-03-26 05:35:09.221	\N	\N	f
7a1c9da7-78c5-4930-977a-48045ab0bc7e	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Take before-service photos	Take two photos of the prepared rooms before the first service block starts.	TODO	MEDIUM	2026-03-26 06:40:00	\N	2026-03-26 05:35:09.224	2026-03-26 05:35:09.224	\N	\N	t
178fd10c-e3ac-4b3a-beec-e5717d28f03d	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Meeting: front desk briefing	Short coordination before the afternoon bookings start.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Reception desk"}	TODO	MEDIUM	2026-03-26 07:30:00	\N	2026-03-26 05:35:09.225	2026-03-26 05:35:09.225	\N	\N	f
ae71f6a5-5420-411c-973f-1fc4a148494b	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Finish laundry cycle	Move washed towels to the drying rack and prepare the second batch.	DONE	HIGH	2026-03-26 04:00:00	\N	2026-03-26 05:35:09.227	2026-03-26 05:35:09.227	\N	\N	f
0f727ff4-9c06-4bcf-ac10-70a0191747d2	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: lobby walkthrough	Check the reception area, promo stand and entrance before the midday traffic starts.	TODO	MEDIUM	2026-03-26 04:15:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
99b76e0e-6e38-42c7-9712-0cc9915d5301	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: approve photo report from stock room	Review the latest stock room cleanup and attach your own confirming photo after the walkthrough.	TODO	HIGH	2026-03-26 06:10:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	t
7a4b2dcd-65b0-4d68-9766-3179f236f130	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: quick sync with reception	Five-minute alignment on the guest flow before the afternoon block.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Reception desk"}	TODO	MEDIUM	2026-03-26 08:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
902607d5-4b51-4865-a9b2-4e80421a5a6f	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: review next week staffing	Review open coverage for the next week and lock the Friday evening handoff.	TODO	HIGH	2026-03-27 09:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
ff73b501-38e7-4897-bbbc-64c87d6a30f3	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: approve studio supply budget	Check forecasted расходники and approve the replenishment budget before the weekend.	TODO	URGENT	2026-03-29 06:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
51a208a3-13ec-49bf-a29f-9efe2374229b	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: 1:1 with Alexander	Short sync on workload, upcoming shifts and room readiness.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Owner office"}	TODO	MEDIUM	2026-03-30 08:30:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
59434edf-6ed0-442a-b589-38cbe8e6a1e0	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: prep VIP room for tomorrow	Prepare the VIP room in advance and check oils, towels and lighting before close.	TODO	HIGH	2026-03-27 11:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
8e811807-8833-458d-82f7-729eb7b1378d	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: confirm weekend inventory count	Count remaining consumables and leave a short note if anything will run out by Sunday.	TODO	MEDIUM	2026-03-29 10:15:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
16ca8f9c-b185-434f-840e-0105ea3c1d57	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: training check-in with owner	15-minute sync to confirm the upcoming service flow updates.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"offline","meetingLocation":"Reception desk"}	TODO	MEDIUM	2026-04-01 07:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
2f33c03d-5c22-4925-845f-5e250c00dabb	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: audit storage room photo report	Walk through the stock room, compare actual shelves with the expected layout and attach fresh photos for the weekly archive.	TODO	HIGH	2026-03-28 10:45:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	t
ddad2bbe-9659-4ac0-937f-0eb13763b1aa	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: sign contractor extension	Review the renewal packet and finish the remaining notes before sending the final confirmation.	IN_PROGRESS	URGENT	2026-03-25 09:30:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
cd654705-07fa-4f4e-b98a-6dacd931450e	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: weekly planning board review	Update the staffing board and flag any open evening coverage for the next seven days.	TODO	MEDIUM	2026-03-31 04:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
d22868b2-79b9-451f-b699-befea8a4865b	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: online finance sync	Review payroll timing and upcoming supplier payments with finance.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"online","meetingLink":"https://meet.google.com/demo-owner-finance"}	TODO	HIGH	2026-03-28 05:30:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
699cd8c3-5b01-4b7f-8e67-01441bd31e70	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Owner: approve weekend promo setup	Check the lobby merchandising draft and confirm the final promo placement before Friday.	TODO	MEDIUM	2026-04-02 08:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
2a1db504-0d27-4b5e-a870-bb45fa546dbc	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: reception zone photo report	Before opening, capture the reception zone, promo stand and waiting area for the manager review.	TODO	HIGH	2026-03-27 02:20:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	t
a1e7b080-130d-4fa3-bbb1-e65a15e5cc69	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: deep clean coffee point	Wipe the machine, replace water, sort cups and leave the station guest-ready.	IN_PROGRESS	HIGH	2026-03-25 06:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
2aa18a3a-2554-4248-9bbf-e9f6ec8cd0ea	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: prepare retail shelf photos	Refresh the travel-size product shelf and upload two clean photos after rearranging the display.	TODO	MEDIUM	2026-03-29 12:00:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	t
9561035c-e0f0-4d5e-9ebe-e3871c1bb38b	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: online product training	Join the short vendor walkthrough and note the new product talking points.\n\n[smart-task-meta] {"kind":"meeting","meetingMode":"online","meetingLink":"https://zoom.us/j/555000222"}	TODO	MEDIUM	2026-03-30 03:30:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
b6afaa5a-e137-47ae-8f07-e95ec95a6935	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: post-shift towel count	Count remaining clean towels after the evening shift and leave the result in the notes.	TODO	LOW	2026-03-31 13:15:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
b9032769-38a2-46cc-8db1-87fccd06183a	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Employee: overdue dust check in studio A	This task intentionally stays overdue in the demo so the dashboard shows an attention case.	TODO	URGENT	2026-03-24 04:30:00	\N	2026-03-26 05:35:09.229	2026-03-26 05:35:09.229	\N	\N	f
\.


--
-- Data for Name: TaskActivity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskActivity" (id, "tenantId", "taskId", "actorEmployeeId", kind, body, "createdAt") FROM stdin;
82d8f401-9266-4298-9659-e7b747781ccb	f8874b2f-0678-4953-b992-d9ab45835109	5d7b77dd-2d51-42c3-9b9d-1c6d43379764	359ca1a4-307d-4005-832f-0d6a408866aa	COMMENT	Reminder: task "Review closing checklist" still requires attention.	2026-03-12 08:20:00.146
6ee758df-5ec0-4fce-bb43-5b20cf8eb36a	f8874b2f-0678-4953-b992-d9ab45835109	59d5b774-ed25-438d-ba78-aeb0f700d03d	359ca1a4-307d-4005-832f-0d6a408866aa	COMMENT	Reminder: task "Approve document packet" still requires attention.	2026-03-12 08:20:00.22
e437ea50-7029-4fdb-8453-8ba717927611	f8874b2f-0678-4953-b992-d9ab45835109	2601ec52-ba33-4447-bb86-42a164846d51	359ca1a4-307d-4005-832f-0d6a408866aa	COMMENT	Reminder: task "Call supplier before noon" still requires attention.	2026-03-12 08:20:00.248
bee77ca0-ff61-4df1-a5fb-bf59642d2dbd	f8874b2f-0678-4953-b992-d9ab45835109	c7ae3581-1e0f-48cb-96d5-9a47afa7533e	359ca1a4-307d-4005-832f-0d6a408866aa	COMMENT	Reminder: task "Check front desk coverage" still requires attention.	2026-03-12 08:20:00.262
c0b31ea3-3bac-45eb-b5ae-61b355bbb2d1	f8874b2f-0678-4953-b992-d9ab45835109	4e0cf8a1-cb69-404c-bffe-8c3cd0835669	359ca1a4-307d-4005-832f-0d6a408866aa	COMMENT	Reminder: task "Follow up with late arrivals" still requires attention.	2026-03-12 08:20:00.271
\.


--
-- Data for Name: TaskAutomationPolicy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskAutomationPolicy" (id, "tenantId", "reminderLeadDays", "reminderRepeatHours", "escalationDelayDays", "escalateToManager", "notifyAssignee", "sendChatMessages", "createdAt", "updatedAt") FROM stdin;
2e454ea2-5d01-49bd-9358-30abc6d63ec9	f8874b2f-0678-4953-b992-d9ab45835109	2	24	1	t	t	t	2026-03-12 08:20:00.097	2026-03-12 08:20:00.097
\.


--
-- Data for Name: TaskChecklistItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskChecklistItem" (id, "tenantId", "taskId", title, "sortOrder", "isCompleted", "completedAt", "completedByEmployeeId", "createdAt", "updatedAt") FROM stdin;
21e06373-ccd3-413f-9d76-f71d4c3cce4d	f8874b2f-0678-4953-b992-d9ab45835109	5d7b77dd-2d51-42c3-9b9d-1c6d43379764	Confirm salon inventory	1	f	\N	\N	2026-03-12 08:16:23.528	2026-03-12 08:16:23.528
b6fcd0f4-f0ee-4f0f-8405-6bdbe667ce61	f8874b2f-0678-4953-b992-d9ab45835109	5d7b77dd-2d51-42c3-9b9d-1c6d43379764	Check alarm handover	2	f	\N	\N	2026-03-12 08:16:23.528	2026-03-12 08:16:23.528
d1e8b773-4c86-4acd-acd2-c291981cd68d	f8874b2f-0678-4953-b992-d9ab45835109	59d5b774-ed25-438d-ba78-aeb0f700d03d	Compare files with purchase request	1	t	2026-03-12 07:16:23.532	359ca1a4-307d-4005-832f-0d6a408866aa	2026-03-12 08:16:23.534	2026-03-12 08:16:23.534
30b4a9be-ce87-4092-87b7-aeff15b8706d	f8874b2f-0678-4953-b992-d9ab45835109	59d5b774-ed25-438d-ba78-aeb0f700d03d	Send approved packet to accounting	2	f	\N	\N	2026-03-12 08:16:23.534	2026-03-12 08:16:23.534
2959342c-cbfd-4a87-9cd7-9ad4e781c178	f8874b2f-0678-4953-b992-d9ab45835109	57ebd78a-5b20-439c-8591-71dd607bef8c	Wipe both desks and mirrors	1	f	\N	\N	2026-03-26 05:35:09.202	2026-03-26 05:35:09.202
c589b3f9-bbe4-4cf0-8220-aa7586c91848	f8874b2f-0678-4953-b992-d9ab45835109	57ebd78a-5b20-439c-8591-71dd607bef8c	Set fresh towels in each room	2	f	\N	\N	2026-03-26 05:35:09.202	2026-03-26 05:35:09.202
3055915f-3aaf-4fa6-8075-1e212017d133	f8874b2f-0678-4953-b992-d9ab45835109	fa1141ea-5e71-4ee4-b218-fff791fdfe16	Count clean towels	1	t	2026-03-26 04:10:00	cfb108b5-d63f-4680-ac17-6e0115f66405	2026-03-26 05:35:09.221	2026-03-26 05:35:09.221
9611bc78-0ea3-4ac0-947a-d436bf67005d	f8874b2f-0678-4953-b992-d9ab45835109	fa1141ea-5e71-4ee4-b218-fff791fdfe16	Refill spray bottles and wipes	2	f	\N	\N	2026-03-26 05:35:09.221	2026-03-26 05:35:09.221
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

COPY public."TaskTemplate" (id, "tenantId", "managerEmployeeId", "assigneeEmployeeId", "groupId", title, description, priority, frequency, "weekDaysJson", "dayOfMonth", "startDate", "endDate", "dueAfterDays", "dueTimeLocal", "checklistJson", "lastGeneratedAt", "isActive", "createdAt", "updatedAt", "departmentId", "locationId", "expandOnDemand", "requiresPhoto") FROM stdin;
49935cfc-6fe6-4c0d-88f4-a5e6661b4334	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Weekly floor walk	Walk the floor, verify opening standards and record any issues that need follow-up.	MEDIUM	WEEKLY	[1,4]	\N	2026-03-25 17:00:00	\N	0	11:00	\N	\N	t	2026-03-26 05:35:09.234	2026-03-26 05:35:09.234	\N	\N	t	t
f99b883e-f624-48b8-961e-87286a0d330e	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	359ca1a4-307d-4005-832f-0d6a408866aa	\N	Monthly vendor approvals	Approve monthly supplier invoices and confirm replenishment windows.	HIGH	MONTHLY	\N	25	2026-03-25 17:00:00	\N	0	13:00	\N	\N	t	2026-03-26 05:35:09.234	2026-03-26 05:35:09.234	\N	\N	t	f
24f67a85-beed-436c-91df-ce95e4e6c39b	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Opening photo report	Upload fresh photos of the reception and first treatment room after opening prep.	HIGH	DAILY	\N	\N	2026-03-25 17:00:00	\N	0	09:30	\N	\N	t	2026-03-26 05:35:09.234	2026-03-26 05:35:09.234	\N	\N	t	t
15adb2ce-f7a0-40ad-8b31-491bd808ed64	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	cfb108b5-d63f-4680-ac17-6e0115f66405	\N	Weekly consumables count	Count gloves, wipes, towels and report anything that will run out before the weekend.	MEDIUM	WEEKLY	[2,5]	\N	2026-03-25 17:00:00	\N	0	18:00	\N	\N	t	2026-03-26 05:35:09.234	2026-03-26 05:35:09.234	\N	\N	t	f
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Tenant" (id, name, slug, timezone, locale, "createdAt", "updatedAt") FROM stdin;
f8874b2f-0678-4953-b992-d9ab45835109	Demo Company	demo	Asia/Novosibirsk	ru	2026-03-07 06:14:03.959	2026-03-07 06:14:03.959
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "tenantId", email, "passwordHash", status, "createdAt", "updatedAt", "workspaceAccessAllowed") FROM stdin;
453467d9-f6a0-47ba-af58-7ced123b3e49	f8874b2f-0678-4953-b992-d9ab45835109	employee@demo.smart	$2b$10$xV9VgEaw13qoTdw5I2mSHOdJYyJj7/zVivi1Ta3BohKcB06pCuItC	ACTIVE	2026-03-07 06:51:23.702	2026-03-26 05:35:09.082	t
d709a25a-44c1-47dd-8dc3-770f35545282	f8874b2f-0678-4953-b992-d9ab45835109	manager@demo.smart	$2b$10$xV9VgEaw13qoTdw5I2mSHOdJYyJj7/zVivi1Ta3BohKcB06pCuItC	ACTIVE	2026-03-24 08:13:39.622	2026-03-26 05:35:09.087	t
b97acdfc-25f0-4a0e-a65d-0051ece8a784	f8874b2f-0678-4953-b992-d9ab45835109	julia@demo.smart	$2b$10$xV9VgEaw13qoTdw5I2mSHOdJYyJj7/zVivi1Ta3BohKcB06pCuItC	ACTIVE	2026-03-12 08:16:23.446	2026-03-26 05:35:09.092	t
33c6251d-1ae0-4292-8930-1db25664cd3e	f8874b2f-0678-4953-b992-d9ab45835109	sergey@demo.smart	$2b$10$xV9VgEaw13qoTdw5I2mSHOdJYyJj7/zVivi1Ta3BohKcB06pCuItC	ACTIVE	2026-03-12 08:16:23.453	2026-03-26 05:35:09.096	t
5e1885d8-5ead-4c1b-bc19-45131883a356	f8874b2f-0678-4953-b992-d9ab45835109	maria@demo.smart	$2b$10$xV9VgEaw13qoTdw5I2mSHOdJYyJj7/zVivi1Ta3BohKcB06pCuItC	ACTIVE	2026-03-12 08:16:23.457	2026-03-26 05:35:09.101	t
922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	f8874b2f-0678-4953-b992-d9ab45835109	new.worker@example.com	$2b$10$CJAg1.PTTWILIkQUiWy/LORPrhloWpEHICYjlfQFblfmfWMyZzeR6	ACTIVE	2026-03-10 14:41:32.616	2026-03-10 14:41:32.616	f
587a860f-b3ad-4748-b663-330bef759b71	f8874b2f-0678-4953-b992-d9ab45835109	owner@demo.smart	$2b$10$XbhqcrOQBSdjwqVZk2FREuCNriKIxc1KPxkzBUxYjg7lUrGAKt5Sq	ACTIVE	2026-03-07 06:14:03.973	2026-03-26 05:35:09.049	t
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserRole" (id, "userId", "roleId", "scopeType", "scopeId", "createdAt") FROM stdin;
36c03dfb-80b6-4ebe-9b5b-36eb6caed5e7	587a860f-b3ad-4748-b663-330bef759b71	193d59ae-99e7-4166-9639-22fc632d3591	tenant	f8874b2f-0678-4953-b992-d9ab45835109	2026-03-07 06:14:03.975
a8bd9797-c7dd-492b-81d3-f6d14f0fb4ff	453467d9-f6a0-47ba-af58-7ced123b3e49	8a1a1762-8e34-4fae-99ed-0de2ceb35325	tenant	f8874b2f-0678-4953-b992-d9ab45835109	2026-03-07 06:51:23.704
dd53621f-296b-4005-a95f-2ef1c78c1e9c	922c283c-4c1f-4a56-b8fd-1f9068b7dd5b	8a1a1762-8e34-4fae-99ed-0de2ceb35325	tenant	f8874b2f-0678-4953-b992-d9ab45835109	2026-03-10 14:41:32.62
667750b1-0cb8-43b1-b840-af18b081e7fa	b97acdfc-25f0-4a0e-a65d-0051ece8a784	8a1a1762-8e34-4fae-99ed-0de2ceb35325	tenant	f8874b2f-0678-4953-b992-d9ab45835109	2026-03-12 08:16:23.447
63a1dc8d-fe15-4945-b876-36807ac809de	33c6251d-1ae0-4292-8930-1db25664cd3e	8a1a1762-8e34-4fae-99ed-0de2ceb35325	tenant	f8874b2f-0678-4953-b992-d9ab45835109	2026-03-12 08:16:23.453
ea85e747-71f6-489c-8214-3f74fab7410e	5e1885d8-5ead-4c1b-bc19-45131883a356	8a1a1762-8e34-4fae-99ed-0de2ceb35325	tenant	f8874b2f-0678-4953-b992-d9ab45835109	2026-03-12 08:16:23.458
ce9044fe-3a3c-4a1b-b8bc-fc0917f36457	d709a25a-44c1-47dd-8dc3-770f35545282	8bdec431-8160-4a03-8fa2-0e8fc174c3a7	tenant	f8874b2f-0678-4953-b992-d9ab45835109	2026-03-24 08:13:39.624
\.


--
-- Data for Name: WorkGroup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkGroup" (id, "tenantId", "managerEmployeeId", name, description, "createdAt", "updatedAt") FROM stdin;
3b88c1f3-f228-4334-b6f1-ea9477402395	f8874b2f-0678-4953-b992-d9ab45835109	359ca1a4-307d-4005-832f-0d6a408866aa	Frontline Operations	Core studio shift group	2026-03-12 08:16:23.515	2026-03-26 05:35:09.17
\.


--
-- Data for Name: WorkGroupMembership; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkGroupMembership" (id, "tenantId", "groupId", "employeeId", "createdAt") FROM stdin;
5dec5406-a784-4ae9-bff4-acc96fed3822	f8874b2f-0678-4953-b992-d9ab45835109	3b88c1f3-f228-4334-b6f1-ea9477402395	cfb108b5-d63f-4680-ac17-6e0115f66405	2026-03-26 05:35:09.179
09d78b38-2eb0-4f2a-8a5f-fd9291495e8b	f8874b2f-0678-4953-b992-d9ab45835109	3b88c1f3-f228-4334-b6f1-ea9477402395	e4dd856f-8747-4df7-897f-f2ada2579795	2026-03-26 05:35:09.179
b16f91c9-9d73-45e2-8145-5315977d80ee	f8874b2f-0678-4953-b992-d9ab45835109	3b88c1f3-f228-4334-b6f1-ea9477402395	efa60105-a29a-4668-a5fc-83f106fae8c6	2026-03-26 05:35:09.179
c3bc9158-004b-4dea-ac53-1f8dabfd2201	f8874b2f-0678-4953-b992-d9ab45835109	3b88c1f3-f228-4334-b6f1-ea9477402395	b25c89d5-25f7-4e78-b76c-4f5f4f9f197b	2026-03-26 05:35:09.179
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

\unrestrict RXNxiCp4Utm99IXu0ibnMbLzq1Ut5BvClbvAisdrYeYnelmnx0kSrbQCBHBWP6a

