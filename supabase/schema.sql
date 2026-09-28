create extension if not exists pgcrypto;

create table if not exists public.faculties (
 id uuid primary key default gen_random_uuid(),
 name text unique not null
);

create table if not exists public.departments (
 id uuid primary key default gen_random_uuid(),
 faculty_id uuid not null references public.faculties(id) on delete cascade,
 name text not null,
 unique(faculty_id,name)
);

create table if not exists public.programmes (
 id uuid primary key default gen_random_uuid(),
 department_id uuid not null references public.departments(id) on delete cascade,
 name text not null,
 unique(department_id,name)
);

create table if not exists public.lecturers (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid unique,
 lecturer_id text unique not null,
 full_name text not null,
 email text unique not null,
 phone text,
 faculty_id uuid references public.faculties(id),
 department_id uuid references public.departments(id),
 teaching_area text,
 photo_url text,
 active boolean default true,
 created_at timestamptz default now()
);

create table if not exists public.students (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid unique,
 student_id text unique not null,
 full_name text not null,
 email text unique not null,
 phone text,
 faculty_id uuid references public.faculties(id),
 department_id uuid references public.departments(id),
 programme_id uuid references public.programmes(id),
 level smallint,
 academic_year text,
 semester text,
 registration_type text not null default 'normal' check(registration_type in ('normal','dissertation')),
 account_status text not null default 'pending_payment' check(account_status in ('pending_payment','active','suspended')),
 photo_url text,
 created_at timestamptz default now()
);

create table if not exists public.modules (
 id uuid primary key default gen_random_uuid(),
 code text unique not null,
 title text not null,
 faculty_id uuid references public.faculties(id),
 department_id uuid references public.departments(id),
 programme_id uuid references public.programmes(id),
 level smallint,
 semester text,
 lecturer_id uuid references public.lecturers(id) on delete set null,
 active boolean default true,
 created_at timestamptz default now()
);

create table if not exists public.student_modules (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 module_id uuid not null references public.modules(id) on delete cascade,
 registered_at timestamptz default now(),
 unique(student_id,module_id)
);

create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 amount numeric(12,2) not null,
 currency text default 'SLE',
 payment_type text not null check(payment_type in ('registration','dissertation')),
 status text default 'pending' check(status in ('pending','paid','failed','cancelled')),
 provider text default 'monime',
 provider_reference text unique,
 verified_at timestamptz,
 created_at timestamptz default now()
);

create table if not exists public.devices (
 id uuid primary key default gen_random_uuid(),
 student_id uuid references public.students(id) on delete cascade,
 lecturer_id uuid references public.lecturers(id) on delete cascade,
 device_token_hash text not null,
 device_label text,
 first_registered_at timestamptz default now(),
 last_seen_at timestamptz,
 revoked_at timestamptz,
 check((student_id is not null) <> (lecturer_id is not null))
);

create table if not exists public.classes (
 id uuid primary key default gen_random_uuid(),
 module_id uuid not null references public.modules(id) on delete cascade,
 lecturer_id uuid not null references public.lecturers(id) on delete cascade,
 class_date date not null,
 start_time time not null,
 end_time time not null,
 location_name text,
 latitude numeric(10,7),
 longitude numeric(10,7),
 radius_meters integer default 100
);

create table if not exists public.attendance (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 device_id uuid references public.devices(id),
 marked_at timestamptz default now(),
 latitude numeric(10,7),
 longitude numeric(10,7),
 distance_meters numeric(10,2),
 status text default 'present' check(status in ('present','late','rejected')),
 unique(class_id,student_id)
);

create table if not exists public.assignments (
 id uuid primary key default gen_random_uuid(),
 module_id uuid not null references public.modules(id) on delete cascade,
 lecturer_id uuid not null references public.lecturers(id) on delete cascade,
 title text not null,
 description text,
 due_at timestamptz not null,
 max_mark numeric(6,2) default 100,
 attachment_url text,
 created_at timestamptz default now()
);

create table if not exists public.submissions (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 file_url text,
 submitted_at timestamptz default now(),
 mark numeric(6,2),
 lecturer_comment text,
 status text default 'submitted',
 unique(assignment_id,student_id)
);

create table if not exists public.grades (
 id uuid primary key default gen_random_uuid(),
 module_id uuid not null references public.modules(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 lecturer_id uuid not null references public.lecturers(id) on delete cascade,
 score numeric(6,2),
 grade text,
 published boolean default false,
 updated_at timestamptz default now(),
 unique(module_id,student_id)
);

create table if not exists public.dissertations (
 id uuid primary key default gen_random_uuid(),
 student_id uuid unique not null references public.students(id) on delete cascade,
 supervisor_id uuid references public.lecturers(id) on delete set null,
 title text,
 status text default 'proposal'
);

create table if not exists public.dissertation_versions (
 id uuid primary key default gen_random_uuid(),
 dissertation_id uuid not null references public.dissertations(id) on delete cascade,
 chapter text not null,
 version_number integer not null,
 file_url text not null,
 lecturer_comment text,
 submitted_at timestamptz default now(),
 unique(dissertation_id,chapter,version_number)
);

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_user_id uuid not null,
 title text not null,
 body text not null,
 read_at timestamptz,
 created_at timestamptz default now()
);

create index if not exists idx_modules_lecturer on public.modules(lecturer_id);
create index if not exists idx_student_modules_student on public.student_modules(student_id);
create index if not exists idx_student_modules_module on public.student_modules(module_id);
create index if not exists idx_attendance_student on public.attendance(student_id);
create index if not exists idx_assignments_module on public.assignments(module_id);
create index if not exists idx_submissions_student on public.submissions(student_id);
create index if not exists idx_grades_student on public.grades(student_id);
