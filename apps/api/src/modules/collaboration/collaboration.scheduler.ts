import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CollaborationService } from './collaboration.service';

@Injectable()
export class CollaborationScheduler {
  private readonly logger = new Logger(CollaborationScheduler.name);

  constructor(private readonly collaborationService: CollaborationService) {}

  @Cron('5 * * * *')
  async generateRecurringTasks() {
    const result = await this.collaborationService.runDueTaskTemplatesForAllTenants();
    if (result !== undefined) {
      this.logger.debug('Recurring task template sweep completed.');
    }
  }

  @Cron('20 * * * *')
  async runTaskAutomation() {
    await this.collaborationService.runTaskAutomationForAllManagers();
    this.logger.debug('Task automation sweep completed.');
  }

  @Cron('35 * * * *')
  async generateRecurringAnnouncements() {
    const generatedCount = await this.collaborationService.runDueAnnouncementTemplatesForAllTenants();
    if (generatedCount !== undefined) {
      this.logger.debug('Recurring announcement template sweep completed.');
    }
  }

  @Cron('* * * * *')
  async publishScheduledAnnouncements() {
    const publishedCount =
      await this.collaborationService.publishDueScheduledAnnouncements();
    if (publishedCount > 0) {
      this.logger.debug(
        `Scheduled announcement sweep published ${publishedCount} announcement(s).`,
      );
    }
  }
}
