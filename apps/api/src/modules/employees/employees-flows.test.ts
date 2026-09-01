import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'employees.service.ts'), 'utf8');

function methodBody(name: string) {
  const start = source.indexOf(`async ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);

  const nextMethod = source.indexOf('\n  async ', start + 1);
  return source.slice(start, nextMethod === -1 ? source.length : nextMethod);
}

function testInvitationEmailFailureDoesNotBlockKommoSync() {
  const createInvitation = methodBody('createInvitation');
  const resendInvitation = methodBody('resendInvitation');

  assert.match(
    source,
    /private async sendInvitationEmailSafely[\s\S]*try \{[\s\S]*sendInvitationEmail\(params\)[\s\S]*catch \(error\)[\s\S]*status: 'failed'/,
    'Invitation email sending must have a safe wrapper that returns a failed delivery result.',
  );
  assert.match(
    createInvitation,
    /emailDeliveryResult = await this\.sendInvitationEmailSafely\(/,
    'Creating an invitation must not call the throwing invitation mailer directly.',
  );
  assert.match(
    createInvitation,
    /recordEmployeeInvited\(tenantId, invitation\.id, emailDeliveryResult\)/,
    'Creating an invitation must sync email delivery status to Kommo.',
  );
  assert.match(
    createInvitation,
    /emailDeliveryStatus: emailDeliveryResult\.status/,
    'Creating an invitation must return email delivery status to the client.',
  );
  assert.match(
    createInvitation,
    /invitationUrl: this\.invitationsMailer\.buildInvitationUrl\(token\)/,
    'Creating an invitation must return a direct fallback URL to the manager.',
  );
  assert.match(
    resendInvitation,
    /emailDeliveryResult = await this\.sendInvitationEmailSafely\(/,
    'Resending an invitation must not call the throwing invitation mailer directly.',
  );
  assert.match(
    resendInvitation,
    /recordEmployeeInvited\(tenantId, invitation\.id, emailDeliveryResult\)/,
    'Resending an invitation must sync email delivery status to Kommo.',
  );
  assert.match(
    resendInvitation,
    /invitationUrl: this\.invitationsMailer\.buildInvitationUrl\(token\)/,
    'Resending an invitation must return a fresh direct fallback URL.',
  );
}

function testReviewEmailsAreSyncedToKommo() {
  const registerFromInvitation = methodBody('registerFromInvitation');
  const reviewInvitation = methodBody('reviewInvitation');

  assert.match(
    registerFromInvitation,
    /recordEmployeeUpdated\([\s\S]*'profile_submitted',[\s\S]*statusEmailResult[\s\S]*\)/,
    'Profile submission approval email status must be synced to Kommo.',
  );
  assert.match(
    reviewInvitation,
    /recordEmployeeUpdated\(tenantId, invitation\.employeeId, 'review_rejected', statusEmailResult\)/,
    'Rejected invitation email status must be synced to Kommo.',
  );
  assert.match(
    reviewInvitation,
    /recordEmployeeUpdated\(tenantId, approved\.employeeId, 'review_approved', credentialsEmailResult\)/,
    'Generated credentials email status must be synced to Kommo.',
  );
  assert.match(
    reviewInvitation,
    /recordEmployeeUpdated\(tenantId, approved\.employeeId, 'review_approved', statusEmailResult\)/,
    'Approved invitation email status must be synced to Kommo.',
  );
}

function testInvitationDeletionIsSyncedToKommo() {
  const deleteInvitationAndEmployee = methodBody('deleteInvitationAndEmployee');

  assert.match(
    deleteInvitationAndEmployee,
    /recordEmployeeInvitationDeleted\(tenantId, invitation\)/,
    'Deleting a pending invitation or pre-created employee must sync the roster change to Kommo.',
  );
}

function testImportedAltegioEmployeeInvitationReusesExistingProfile() {
  const inviteExistingEmployee = methodBody('inviteExistingEmployee');
  const registerFromInvitation = methodBody('registerFromInvitation');

  assert.match(
    inviteExistingEmployee,
    /resolveEmployeeVisibilityWhere\(tenantId, actorUserId\)/,
    'Managers may invite only employees in their assigned scope.',
  );
  assert.match(
    inviteExistingEmployee,
    /userId: employee\.userId, employeeId,/,
    'An invitation for imported staff must be linked to the existing user and employee.',
  );
  assert.match(
    registerFromInvitation,
    /invitation\.userId \? await tx\.user\.update/,
    'Registering an imported employee must activate the existing user instead of creating a duplicate.',
  );
  assert.match(
    registerFromInvitation,
    /invitation\.employeeId \? await tx\.employee\.update/,
    'Registering an imported employee must update the existing employee instead of creating a duplicate.',
  );
}

testInvitationEmailFailureDoesNotBlockKommoSync();
testReviewEmailsAreSyncedToKommo();
testInvitationDeletionIsSyncedToKommo();
testImportedAltegioEmployeeInvitationReusesExistingProfile();

console.log('employees flow tests passed');
