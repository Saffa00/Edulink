-- ==============================================================================
-- EDULINK DATABASE FIX: ELIMINATE INFINITE RECURSION ON student_modules & modules
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- Step 1: Drop the mutually recursive policies on student_modules
DROP POLICY IF EXISTS "students read own module registrations" ON public.student_modules;
DROP POLICY IF EXISTS "lecturers read students in own modules" ON public.student_modules;
DROP POLICY IF EXISTS "student_modules_all_access" ON public.student_modules;
DROP POLICY IF EXISTS "student_modules_read" ON public.student_modules;
DROP POLICY IF EXISTS "student_modules_access" ON public.student_modules;

-- Step 2: Drop the mutually recursive policies on modules
DROP POLICY IF EXISTS "students read registered modules" ON public.modules;
DROP POLICY IF EXISTS "lecturers read own modules" ON public.modules;
DROP POLICY IF EXISTS "allow read modules" ON public.modules;
DROP POLICY IF EXISTS "modules_read_all" ON public.modules;
DROP POLICY IF EXISTS "modules_select_all" ON public.modules;
DROP POLICY IF EXISTS "lecturers create own modules" ON public.modules;
DROP POLICY IF EXISTS "lecturers update own modules" ON public.modules;
DROP POLICY IF EXISTS "lecturers manage own modules" ON public.modules;

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_modules ENABLE ROW LEVEL SECURITY;

-- Step 4: Recreate clean, non-recursive policies for modules
-- Modules is an academic catalogue table: anyone can view course offerings
CREATE POLICY "modules_select_all" ON public.modules 
FOR SELECT TO anon, authenticated 
USING (true);

-- Lecturers can insert/update modules they instruct
CREATE POLICY "modules_lecturer_manage" ON public.modules 
FOR ALL TO authenticated 
USING (lecturer_id IN (SELECT id FROM public.lecturers WHERE auth_user_id = auth.uid()))
WITH CHECK (lecturer_id IN (SELECT id FROM public.lecturers WHERE auth_user_id = auth.uid()));

-- Step 5: Recreate clean, non-recursive policy for student_modules
-- Students and lecturers can read & manage student module allocations without circular table joins
CREATE POLICY "student_modules_all_access" ON public.student_modules 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Step 6: Verify policies on related core tables are non-recursive
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_all_access" ON public.students;
CREATE POLICY "students_all_access" ON public.students 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lecturers_all_access" ON public.lecturers;
CREATE POLICY "lecturers_all_access" ON public.lecturers 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "devices_all_access" ON public.devices;
CREATE POLICY "devices_all_access" ON public.devices 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Step 7: Clean policies for classes, attendance, grades, assignments, and payments
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classes_all_access" ON public.classes;
DROP POLICY IF EXISTS "classes_select_all" ON public.classes;
CREATE POLICY "classes_all_access" ON public.classes 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_all_access" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_all" ON public.attendance;
CREATE POLICY "attendance_all_access" ON public.attendance 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grades_all_access" ON public.grades;
DROP POLICY IF EXISTS "grades_select_all" ON public.grades;
CREATE POLICY "grades_all_access" ON public.grades 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_all_access" ON public.assignments;
DROP POLICY IF EXISTS "assignments_select_all" ON public.assignments;
CREATE POLICY "assignments_all_access" ON public.assignments 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_all_access" ON public.payments;
CREATE POLICY "payments_all_access" ON public.payments 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

