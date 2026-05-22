ALTER TABLE "apps" DROP CONSTRAINT "apps_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_app_id_apps_id_fk";
