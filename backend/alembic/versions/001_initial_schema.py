"""initial schema

Revision ID: 001
Revises: None
Create Date: 2026-06-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Enable Extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('auth_provider', sa.String(), nullable=False),
        sa.Column('github_user_id', sa.String(), nullable=True),
        sa.Column('github_access_token_encrypted', sa.LargeBinary(), nullable=True),
        sa.Column('github_sync_status', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 3. Create Vaults Table
    op.create_table(
        'vaults',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('base_template_id', sa.String(), nullable=False, server_default='default'),
        sa.Column('source_origin', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=True),
        sa.Column('parse_confidence_score', sa.Float(), nullable=True),
        sa.Column('github_sync_status', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('constants_data', sa.JSON(), nullable=False),
        sa.Column('skills_data', sa.JSON(), nullable=False),
        sa.Column('has_summary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    op.create_index('ix_vaults_user_id', 'vaults', ['user_id'])

    # 4. Create Projects Table (without embedding initially to avoid type issues)
    op.create_table(
        'projects',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('vault_id', sa.UUID(as_uuid=True), sa.ForeignKey('vaults.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('github_url', sa.String(), nullable=False),
        sa.Column('live_url', sa.String(), nullable=True),
        sa.Column('structured_data', sa.JSON(), nullable=False),
        sa.Column('last_synced_commit', sa.String(), nullable=True),
        sa.Column('user_impact_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    op.create_index('ix_projects_user_id', 'projects', ['user_id'])
    op.create_index('ix_projects_vault_id', 'projects', ['vault_id'])

    # Add the pgvector embedding column to projects table using raw SQL as requested
    op.execute("ALTER TABLE projects ADD COLUMN embedding vector(1536);")

    # 5. Create Internships Table
    op.create_table(
        'internships',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('vault_id', sa.UUID(as_uuid=True), sa.ForeignKey('vaults.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('company_name', sa.String(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('duration_months', sa.Integer(), nullable=True),
        sa.Column('description_bullets', sa.JSON(), nullable=False),
        sa.Column('role_domain', sa.String(), nullable=False),
        sa.Column('inferred_tech_stack', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    op.create_index('ix_internships_user_id', 'internships', ['user_id'])
    op.create_index('ix_internships_vault_id', 'internships', ['vault_id'])

    # 6. Create Resume Archive Table
    op.create_table(
        'resume_archive',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vault_id', sa.UUID(as_uuid=True), sa.ForeignKey('vaults.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('pdf_s3_key', sa.String(), nullable=False),
        sa.Column('tex_s3_key', sa.String(), nullable=False),
        sa.Column('jd_hash', sa.String(), nullable=False),
        sa.Column('jd_text', sa.Text(), nullable=False),
        sa.Column('forge_config', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    op.create_index('ix_resume_archive_user_id', 'resume_archive', ['user_id'])
    op.create_index('ix_resume_archive_vault_id', 'resume_archive', ['vault_id'])
    op.create_index('ix_resume_archive_jd_hash', 'resume_archive', ['jd_hash'], unique=True)

    # 7. Create Scraped Jobs Table
    op.create_table(
        'scraped_jobs',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('company', sa.String(), nullable=False),
        sa.Column('location', sa.String(), nullable=False),
        sa.Column('pay', sa.String(), nullable=True),
        sa.Column('source_site', sa.String(), nullable=False),
        sa.Column('apply_url', sa.String(), nullable=False),
        sa.Column('jd_text', sa.Text(), nullable=False),
        sa.Column('fingerprint', sa.String(), nullable=False),
        sa.Column('scraped_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW() + INTERVAL '30 days'"))
    )
    op.create_index('ix_scraped_jobs_fingerprint', 'scraped_jobs', ['fingerprint'], unique=True)

    # 8. Create Scraper Logs Table
    op.create_table(
        'scraper_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('source_site', sa.String(), nullable=False),
        sa.Column('error_type', sa.String(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )

    # 9. Create API Usage Table
    op.create_table(
        'api_usage',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('model_name', sa.String(), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False),
        sa.Column('completion_tokens', sa.Integer(), nullable=False),
        sa.Column('total_tokens', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()'))
    )
    op.create_index('ix_api_usage_user_id', 'api_usage', ['user_id'])

    # 10. Enforce Limit Constraints (Triggers)
    
    # 10.1 Vault trigger (max 3 per user)
    op.execute("""
    CREATE OR REPLACE FUNCTION check_vault_limit()
    RETURNS TRIGGER AS $$
    BEGIN
        IF (SELECT COUNT(*) FROM vaults WHERE user_id = NEW.user_id) >= 3 THEN
            RAISE EXCEPTION 'Maximum limit of 3 vaults per user exceeded';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)
    op.execute("""
    CREATE TRIGGER check_vault_limit_trigger
    BEFORE INSERT ON vaults
    FOR EACH ROW EXECUTE FUNCTION check_vault_limit();
    """)

    # 10.2 Projects trigger (max 8 per vault)
    op.execute("""
    CREATE OR REPLACE FUNCTION check_project_limit()
    RETURNS TRIGGER AS $$
    BEGIN
        IF (SELECT COUNT(*) FROM projects WHERE vault_id = NEW.vault_id) >= 8 THEN
            RAISE EXCEPTION 'Maximum limit of 8 projects per vault exceeded';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)
    op.execute("""
    CREATE TRIGGER check_project_limit_trigger
    BEFORE INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION check_project_limit();
    """)

    # 10.3 Internships trigger (max 8 per vault)
    op.execute("""
    CREATE OR REPLACE FUNCTION check_internship_limit()
    RETURNS TRIGGER AS $$
    BEGIN
        IF (SELECT COUNT(*) FROM internships WHERE vault_id = NEW.vault_id) >= 8 THEN
            RAISE EXCEPTION 'Maximum limit of 8 internships per vault exceeded';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)
    op.execute("""
    CREATE TRIGGER check_internship_limit_trigger
    BEFORE INSERT ON internships
    FOR EACH ROW EXECUTE FUNCTION check_internship_limit();
    """)


def downgrade() -> None:
    # Drop triggers first
    op.execute("DROP TRIGGER IF EXISTS check_internship_limit_trigger ON internships;")
    op.execute("DROP TRIGGER IF EXISTS check_project_limit_trigger ON projects;")
    op.execute("DROP TRIGGER IF EXISTS check_vault_limit_trigger ON vaults;")

    # Drop functions
    op.execute("DROP FUNCTION IF EXISTS check_internship_limit();")
    op.execute("DROP FUNCTION IF EXISTS check_project_limit();")
    op.execute("DROP FUNCTION IF EXISTS check_vault_limit();")

    # Drop tables in dependent order
    op.drop_table("api_usage")
    op.drop_table("scraper_logs")
    op.drop_table("scraped_jobs")
    op.drop_table("resume_archive")
    op.drop_table("internships")
    op.drop_table("projects")
    op.drop_table("vaults")
    op.drop_table("users")
