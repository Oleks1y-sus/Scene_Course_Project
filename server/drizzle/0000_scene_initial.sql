CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SHADOW_BANNED', 'BANNED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."webinar_category" AS ENUM('TECHNOLOGY', 'MARKETING', 'DESIGN', 'BUSINESS', 'EDUCATION', 'HEALTH', 'CREATIVE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."webinar_status" AS ENUM('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('VISIBLE', 'PENDING', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('REGISTERED', 'ATTENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('WEBINAR', 'USER');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('SPAM', 'INAPPROPRIATE_CONTENT', 'INAPPROPRIATE_NAME', 'INAPPROPRIATE_AVATAR', 'MISLEADING', 'HARASSMENT', 'COPYRIGHT', 'IMPERSONATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."auth_code_purpose" AS ENUM('VERIFY_EMAIL', 'LOGIN', 'CHANGE_EMAIL', 'ADMIN_INVITE');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('AVATAR', 'COVER');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(60) NOT NULL,
	"bio" varchar(280),
	"avatar_preset" varchar(20) DEFAULT 'avatar-01' NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"pending_email" varchar(254),
	"must_change_password" boolean DEFAULT false NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" varchar(255),
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"purpose" "auth_code_purpose" NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "auth_codes_lookup_idx" ON "auth_codes" USING btree ("email", "purpose", "created_at");--> statement-breakpoint
CREATE INDEX "auth_codes_user_idx" ON "auth_codes" USING btree ("user_id");--> statement-breakpoint
CREATE TABLE "webinars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"category" "webinar_category" DEFAULT 'OTHER' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"cover_preset" varchar(20) DEFAULT 'cover-01' NOT NULL,
	"cover_url" text,
	"status" "webinar_status" DEFAULT 'UPCOMING' NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'VISIBLE' NOT NULL,
	"moderation_note" varchar(280),
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"language" varchar(8) DEFAULT 'uk' NOT NULL,
	"live_started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "webinars_duration_check" CHECK ("webinars"."duration_minutes" BETWEEN 15 AND 480),
	CONSTRAINT "webinars_capacity_check" CHECK ("webinars"."capacity" BETWEEN 1 AND 10000)
);--> statement-breakpoint
CREATE UNIQUE INDEX "webinars_slug_unique" ON "webinars" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "webinars_owner_idx" ON "webinars" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "webinars_starts_idx" ON "webinars" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "webinars_status_idx" ON "webinars" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webinars_moderation_idx" ON "webinars" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "webinars_category_idx" ON "webinars" USING btree ("category");--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"webinar_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_webinar_unique" ON "favorites" USING btree ("user_id", "webinar_id");--> statement-breakpoint
CREATE INDEX "favorites_webinar_idx" ON "favorites" USING btree ("webinar_id");--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"webinar_id" uuid NOT NULL,
	"status" "registration_status" DEFAULT 'REGISTERED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_user_webinar_unique" ON "registrations" USING btree ("user_id", "webinar_id");--> statement-breakpoint
CREATE INDEX "registrations_webinar_idx" ON "registrations" USING btree ("webinar_id");--> statement-breakpoint
CREATE INDEX "registrations_user_idx" ON "registrations" USING btree ("user_id");--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"storage_key" varchar(255),
	"public_url" text NOT NULL,
	"mime" varchar(50) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "media_owner_idx" ON "media" USING btree ("owner_id", "kind");--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" "report_target" NOT NULL,
	"webinar_id" uuid,
	"user_id" uuid,
	"reason" "report_reason" NOT NULL,
	"details" varchar(1000),
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"is_automated" boolean DEFAULT false NOT NULL,
	"resolution_note" varchar(500),
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_target_check" CHECK (("reports"."target_type" = 'WEBINAR' AND "reports"."webinar_id" IS NOT NULL AND "reports"."user_id" IS NULL)
        OR ("reports"."target_type" = 'USER' AND "reports"."user_id" IS NOT NULL AND "reports"."webinar_id" IS NULL))
);--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type");--> statement-breakpoint
CREATE INDEX "reports_webinar_idx" ON "reports" USING btree ("webinar_id");--> statement-breakpoint
CREATE INDEX "reports_user_idx" ON "reports" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_open_unique" ON "reports" USING btree ("reporter_id", "target_type", coalesce("webinar_id", "user_id")) WHERE "reports"."status" = 'OPEN' AND "reports"."reporter_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" varchar(60) NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" uuid,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "audit_logs_admin_idx" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
