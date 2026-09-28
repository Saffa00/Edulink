insert into public.faculties(name) values
('Faculty of Computing'),('Faculty of Business'),('Faculty of Engineering')
on conflict(name) do nothing;

insert into public.departments(faculty_id,name)
select f.id, x.name from public.faculties f
cross join (values ('Computer Science'),('Information Systems'),('Software Engineering')) x(name)
where f.name='Faculty of Computing'
on conflict(faculty_id,name) do nothing;

insert into public.modules(code,title) values
('CSOR 224','Operations Research'),
('C++ 101','C++ Programming'),
('CS 302','Distributed & Concurrent Systems'),
('CS 401','Research Methods in Software Engineering')
on conflict(code) do nothing;
