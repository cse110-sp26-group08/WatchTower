ALTER TABLE "apps" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "down_or_not" json DEFAULT '[]'::json NOT NULL;