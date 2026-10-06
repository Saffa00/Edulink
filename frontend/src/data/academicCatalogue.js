// Milton Margai Technical University (MMTU) / Academic Structure
// Campuses with strictly linked Faculties, Departments, Programmes, and Modules

export const CAMPUSES_DATA = [
  {
    id: "goderich",
    name: "Goderich Campus (Main Campus)",
    location: "Goderich, Freetown",
    latitude: 8.42431,
    longitude: -13.28477,
    radiusMeters: 150,
    faculties: [
      {
        id: "faculty-education",
        name: "Faculty of Education",
        departments: [
          {
            id: "dept-education",
            name: "Department of Education",
            modules: [
              { code: "EDU 101", title: "Introduction to Education & Pedagogy" },
              { code: "EDU 201", title: "Educational Administration & Leadership" },
              { code: "EDU 204", title: "Curriculum Development & Teaching Practice" }
            ]
          },
          {
            id: "dept-language-education",
            name: "Department of Language Education",
            modules: [
              { code: "LED 101", title: "English Language Studies & Grammar" },
              { code: "LED 102", title: "French Communication Skills & Pedagogy" },
              { code: "LED 201", title: "Applied Linguistics & Indigenous Languages" }
            ]
          },
          {
            id: "dept-guidance-counselling",
            name: "Department of Guidance and Counselling",
            modules: [
              { code: "EGC 101", title: "Fundamentals of Guidance & Counselling" },
              { code: "EGC 201", title: "Psychological Testing & School Counselling" },
              { code: "EGC 202", title: "Youth Development & Behaviour Modification" }
            ]
          },
          {
            id: "dept-performing-arts",
            name: "Department of Performing Arts",
            modules: [
              { code: "PRF 101", title: "Music Theory, Voice & Instrumental Practice" },
              { code: "PRF 102", title: "African Theatre, Drama & Stage Performance" },
              { code: "PRF 201", title: "Choreography & Cultural Arts Expression" }
            ]
          },
          {
            id: "dept-human-kinetics",
            name: "Department of Human Kinetics",
            modules: [
              { code: "HUK 101", title: "Anatomy, Physiology & Physical Fitness" },
              { code: "HUK 201", title: "Sports Coaching, Kinesiology & Biomechanics" },
              { code: "HUK 202", title: "Health Promotion, First Aid & Safety" }
            ]
          },
          {
            id: "dept-visual-arts",
            name: "Department of Visual Arts",
            modules: [
              { code: "ART 101", title: "Fundamentals of Drawing, Painting & Fine Art" },
              { code: "ART 102", title: "Applied Arts, Ceramics & Textile Design" },
              { code: "ART 201", title: "Sculpture, Graphic Communication & Crafts" }
            ]
          },
          {
            id: "dept-rme",
            name: "Department of Religious and Moral Education",
            modules: [
              { code: "RME 101", title: "Comparative Religious Studies & Moral Ethics" },
              { code: "RME 102", title: "Christian & Islamic Religious Traditions" },
              { code: "RME 201", title: "Philosophy of Religion & Character Education" }
            ]
          },
          {
            id: "dept-early-childhood",
            name: "Department of Early Childhood Education",
            modules: [
              { code: "ECE 101", title: "Early Childhood Development & Psychology" },
              { code: "ECE 102", title: "Play-Based Curriculum & Nursery Pedagogy" },
              { code: "ECE 201", title: "Child Health, Nutrition & Safety" }
            ]
          }
        ],
        programmes: [
          "Bachelor of Education (B.Ed.) Early Childhood Education",
          "Bachelor of Education (B.Ed.) Educational Administration & Management",
          "Bachelor of Education (B.Ed.) Educational Guidance & Counselling",
          "Bachelor of Education (B.Ed.) English",
          "Bachelor of Education (B.Ed.) French",
          "Bachelor of Education (B.Ed.) Measurement & Evaluation",
          "Bachelor of Education (B.Ed.) Performing Arts",
          "Bachelor of Education (B.Ed.) Physical Health Education",
          "Bachelor of Education (B.Ed.) Religious Studies",
          "Bachelor of Education (B.Ed.) Business Studies",
          "Bachelor of Education (B.Ed.) Visual Arts (Fine & Applied Arts)",
          "Higher Teachers Certificate (HTC) Secondary",
          "Higher Teachers Certificate (HTC) Primary",
          "National Diploma in Education & Social Studies"
        ]
      },
      {
        id: "faculty-applied-sciences",
        name: "Faculty of Pure and Applied Sciences",
        departments: [
          {
            id: "dept-mathematics",
            name: "Department of Mathematics",
            modules: [
              { code: "MAT 101", title: "Calculus, Vectors & Analytic Geometry" },
              { code: "MAT 201", title: "Linear Algebra & Differential Equations" },
              { code: "MAT 202", title: "Numerical Analysis & Mathematical Modelling" }
            ]
          },
          {
            id: "dept-computer-science",
            name: "Department of Computer Science",
            modules: [
              // YEAR ONE FIRST SEMESTER (Level 1, First Semester) - 8 modules
              { code: "BSCS 111", title: "Introduction To Computing & Operating Systems", level: 1, semester: "First Semester", lecturerName: "Dr. Alusine Jalloh", lecturerId: "LECT-2026-1002" },
              { code: "BSCS 112", title: "Principles Of Programming Languages", level: 1, semester: "First Semester", lecturerName: "Mr. Samuel Bangura", lecturerId: "LECT-2026-1003" },
              { code: "BSCS 113", title: "Discrete Structure", level: 1, semester: "First Semester", lecturerName: "Mrs. Aminata Conteh", lecturerId: "LECT-2026-1004" },
              { code: "BSCS 114", title: "System Analysis and Design", level: 1, semester: "First Semester", lecturerName: "Dr. Mohamed Koroma", lecturerId: "LECT-2026-1005" },
              { code: "MAT 111", title: "General Mathematics I (Pre-Calculus)", level: 1, semester: "First Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "ENG 111", title: "General English", level: 1, semester: "First Semester", lecturerName: "Ms. Fatmata Turay", lecturerId: "LECT-2026-1007" },
              { code: "CDS 111", title: "Community Development Studies", level: 1, semester: "First Semester", lecturerName: "Mr. Joseph Kamara", lecturerId: "LECT-2026-1008" },
              { code: "PHY 111", title: "Physics I", level: 1, semester: "First Semester", lecturerName: "Dr. Edward Cole", lecturerId: "LECT-2026-1009" },

              // YEAR ONE SECOND SEMESTER (Level 1, Second Semester) - 8 modules
              { code: "BSCS 121", title: "Computer Application Packages", level: 1, semester: "Second Semester", lecturerName: "Mr. Samuel Bangura", lecturerId: "LECT-2026-1003" },
              { code: "BSCS 122", title: "Programing in vb.net", level: 1, semester: "Second Semester", lecturerName: "Dr. Alusine Jalloh", lecturerId: "LECT-2026-1002" },
              { code: "STA 121", title: "Linear Statistical Methods", level: 1, semester: "Second Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "BSCS 123", title: "System Analysis and Design II", level: 1, semester: "Second Semester", lecturerName: "Dr. Mohamed Koroma", lecturerId: "LECT-2026-1005" },
              { code: "MAT 122", title: "Pre Calculus II", level: 1, semester: "Second Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "ENG 122", title: "General English", level: 1, semester: "Second Semester", lecturerName: "Ms. Fatmata Turay", lecturerId: "LECT-2026-1007" },
              { code: "CDS 122", title: "Community Development Studies", level: 1, semester: "Second Semester", lecturerName: "Mr. Joseph Kamara", lecturerId: "LECT-2026-1008" },
              { code: "PHY 122", title: "Physics II", level: 1, semester: "Second Semester", lecturerName: "Dr. Edward Cole", lecturerId: "LECT-2026-1009" },

              // YEAR TWO FIRST SEMESTER (Level 2, First Semester) - 8 modules
              { code: "BSCS 211", title: "Data Structure and Algorithm", level: 2, semester: "First Semester", lecturerName: "Dr. Alusine Jalloh", lecturerId: "LECT-2026-1002" },
              { code: "BSCS 212", title: "Advanced Programming in Vb.Net", level: 2, semester: "First Semester", lecturerName: "Mr. Samuel Bangura", lecturerId: "LECT-2026-1003" },
              { code: "MAT 211", title: "Technology Mathematics", level: 2, semester: "First Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "BSCS 213", title: "Programming In C++", level: 2, semester: "First Semester", lecturerName: "Dr. Alusine Jalloh", lecturerId: "LECT-2026-1002" },
              { code: "BSCS 214", title: "Data Communication & Networking", level: 2, semester: "First Semester", lecturerName: "Mr. Foday Mansaray", lecturerId: "LECT-2026-1010" },
              { code: "BSCS 215", title: "Database Design and Management I", level: 2, semester: "First Semester", lecturerName: "Mrs. Aminata Conteh", lecturerId: "LECT-2026-1004" },
              { code: "BSCS 216", title: "Programming Java I", level: 2, semester: "First Semester", lecturerName: "Dr. Mohamed Koroma", lecturerId: "LECT-2026-1005" },
              { code: "ENG 212", title: "English", level: 2, semester: "First Semester", lecturerName: "Ms. Fatmata Turay", lecturerId: "LECT-2026-1007" },

              // YEAR TWO SECOND SEMESTER (Level 2, Second Semester) - 10 modules
              { code: "BSCS 221", title: "Programming in HTML and CSS", level: 2, semester: "Second Semester", lecturerName: "Mr. Samuel Bangura", lecturerId: "LECT-2026-1003" },
              { code: "BSCS 222", title: "Advanced Programming in C++", level: 2, semester: "Second Semester", lecturerName: "Dr. Alusine Jalloh", lecturerId: "LECT-2026-1002" },
              { code: "CSOR 224", title: "Operational Research", level: 2, semester: "Second Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "BSCS 223", title: "Network Security", level: 2, semester: "Second Semester", lecturerName: "Mr. Foday Mansaray", lecturerId: "LECT-2026-1010" },
              { code: "BSCS 225", title: "Database Design and Management II", level: 2, semester: "Second Semester", lecturerName: "Mrs. Aminata Conteh", lecturerId: "LECT-2026-1004" },
              { code: "STA 221", title: "Statistical Computing and Algorithms", level: 2, semester: "Second Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "BSCS 226", title: "Programming In Java II", level: 2, semester: "Second Semester", lecturerName: "Dr. Mohamed Koroma", lecturerId: "LECT-2026-1005" },
              { code: "BSCS 227", title: "Project Management", level: 2, semester: "Second Semester", lecturerName: "Dr. Mohamed Koroma", lecturerId: "LECT-2026-1005" },
              { code: "BSCS 228", title: "Cyber Security", level: 2, semester: "Second Semester", lecturerName: "Mr. Foday Mansaray", lecturerId: "LECT-2026-1010" },
              { code: "BSCS 229", title: "Programming in c++ II", level: 2, semester: "Second Semester", lecturerName: "Dr. Alusine Jalloh", lecturerId: "LECT-2026-1002" },

              // YEAR THREE FIRST SEMESTER (Level 3, First Semester) - 8 modules including BSCS 411 Oracle & BSCS 412 C++
              { code: "Bscs 411", title: "Oracle", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "Bscs 412", title: "C++", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 311", title: "Software engineering", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 312", title: "Research methodology", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 313", title: "Distributed and concurrent system", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 314", title: "Information and business modeling", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 315", title: "Introduction to artificial intelligence", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 316", title: "Cloud Computing & Architecture", level: 3, semester: "First Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },

              // YEAR THREE SECOND SEMESTER (Level 3, Second Semester) - 8 modules
              { code: "BSCS 321", title: "Computer architecture", level: 3, semester: "Second Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 322", title: "Software engineering II", level: 3, semester: "Second Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 323", title: "Advance database", level: 3, semester: "Second Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 324", title: "Multimedia", level: 3, semester: "Second Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 325", title: "PHP", level: 3, semester: "Second Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "STA 321", title: "SPSS", level: 3, semester: "Second Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "BSCS 326", title: "Ethics in professionalism", level: 3, semester: "Second Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" },
              { code: "BSCS 328", title: "Final Year Capstone Project", level: 3, semester: "Second Semester", lecturerName: "Peter Saffa", lecturerId: "LECT-2026-790380" }
            ]
          },
          {
            id: "dept-integrated-science",
            name: "Department of Integrated Science",
            modules: [
              { code: "ISC 101", title: "General Physical & Chemical Principles" },
              { code: "ISC 102", title: "Biological Foundations & Environment" },
              { code: "ISC 201", title: "Integrated Science Laboratory Experiments" }
            ]
          },
          {
            id: "dept-community-dev",
            name: "Department of Community Development Studies",
            modules: [
              { code: "CDS 101", title: "Community Needs Assessment & Participation" },
              { code: "CDS 201", title: "Rural Project Planning & NGO Management" },
              { code: "CDS 202", title: "Monitoring, Evaluation & Social Impact" }
            ]
          },
          {
            id: "dept-agric-science",
            name: "Department of Agricultural Science",
            modules: [
              { code: "AGR 101", title: "Principles of Crop Production & Agronomy" },
              { code: "AGR 201", title: "Soil Science, Fertility & Plant Protection" },
              { code: "AGR 202", title: "Agricultural Economics & Farm Management" }
            ]
          },
          {
            id: "dept-home-science",
            name: "Department of Home Science",
            modules: [
              { code: "HSC 101", title: "Family Resource Management & Consumer Education" },
              { code: "HSC 201", title: "Food Science, Nutrition & Meal Planning" },
              { code: "HSC 202", title: "Textiles, Clothing & Interior Decoration" }
            ]
          },
          {
            id: "dept-public-health",
            name: "Department of Public Health",
            modules: [
              // Year 1 / Level 1 First Semester
              { code: "PBH 111", title: "Introduction to Public Health & Epidemiology", level: 1, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "PBH 112", title: "Environmental Sanitation & Water Quality", level: 1, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "PBH 113", title: "Health Promotion, Policy & Community Hygiene", level: 1, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "PBH 114", title: "Principles of Disease Prevention & Control", level: 1, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "MAT 111", title: "General Mathematics (Pre-Calculus)", level: 1, semester: "First Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "ENG 111", title: "General English", level: 1, semester: "First Semester", lecturerName: "Ms. Fatmata Turay", lecturerId: "LECT-2026-1007" },
              { code: "CDS 111", title: "Community Development Studies", level: 1, semester: "First Semester", lecturerName: "Mr. Joseph Kamara", lecturerId: "LECT-2026-1008" },
              { code: "BIO 111", title: "Biology for Health Sciences", level: 1, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },

              // Year 2 / Level 2 First Semester
              { code: "PBH 211", title: "Infectious Disease Surveillance & Control", level: 2, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "PBH 212", title: "Occupational Safety & Industrial Health", level: 2, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "PBH 213", title: "Maternal, Newborn & Child Health (MNCH)", level: 2, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "PBH 214", title: "Public Health Nutrition & Food Security", level: 2, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "STA 211", title: "Biostatistics & Health Data Analysis", level: 2, semester: "First Semester", lecturerName: "Dr. Ibrahim Sesay", lecturerId: "LECT-2026-1006" },
              { code: "PBH 215", title: "Global Health Systems & Policy Planning", level: 2, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "PBH 216", title: "Public Health Microbiology & Parasitology", level: 2, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "ENG 212", title: "Scientific Writing & Communication", level: 2, semester: "First Semester", lecturerName: "Ms. Fatmata Turay", lecturerId: "LECT-2026-1007" },

              // Year 3 / Level 3 First Semester (8 modules)
              { code: "PBH 311", title: "Advanced Applied Epidemiology & Outbreak Response", level: 3, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "PBH 312", title: "Health Economics, Financing & Management", level: 3, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "PBH 313", title: "Health Information Systems & Digital Informatics", level: 3, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "PBH 314", title: "Community Health Intervention & Behavioral Science", level: 3, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "PBH 315", title: "Disaster Preparedness & Emergency Health Logistics", level: 3, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "PBH 316", title: "Public Health Law, Ethics & Human Rights", level: 3, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" },
              { code: "PBH 317", title: "Research Methodology & Applied Bioethics", level: 3, semester: "First Semester", lecturerName: "Dr. Isatu Bah", lecturerId: "LECT-2026-1030" },
              { code: "PBH 318", title: "Public Health Field Practicum & Community Inspection", level: 3, semester: "First Semester", lecturerName: "Dr. Alimamy Conteh", lecturerId: "LECT-2026-1031" }
            ]
          }
        ],
        programmes: [
          "Bachelor of Science (B.Sc.) Computer Science",
          "Bachelor of Science (B.Sc.) Information Technology",
          "Bachelor of Science (B.Sc.) Mathematics",
          "Bachelor of Science (B.Sc.) Integrated Science",
          "Bachelor of Science (B.Sc.) Agricultural Science (General)",
          "Bachelor of Science (B.Sc.) Community Development Studies / Agricultural Science",
          "Bachelor of Science (B.Sc.) Community Development Studies / Home Science",
          "Bachelor of Science (B.Sc.) Home Science",
          "Bachelor of Science (B.Sc.) Public Health",
          "Diploma / HND Computer Science",
          "Diploma / HND Agricultural / Fish Farming",
          "Certificate in Statistics & Laboratory Technology"
        ]
      },
      {
        id: "faculty-social-sciences",
        name: "Faculty of Social Sciences",
        departments: [
          {
            id: "dept-social-studies",
            name: "Department of Social Studies",
            modules: [
              { code: "SOS 101", title: "Foundation of Social Studies & Sierra Leone Society" },
              { code: "SOS 201", title: "Economic & Political Environment of West Africa" },
              { code: "SOS 202", title: "Population Dynamics, Geography & Social Change" }
            ]
          },
          {
            id: "dept-public-admin",
            name: "Department of Public Administration",
            modules: [
              { code: "PAD 101", title: "Theory & Practice of Public Administration" },
              { code: "PAD 201", title: "Public Policy Formulation, Analysis & Implementation" },
              { code: "PAD 202", title: "Local Government Administration & Decentralization" }
            ]
          },
          {
            id: "dept-social-work",
            name: "Department of Social Work",
            modules: [
              { code: "SWK 101", title: "Introduction to Social Work Theory & Ethics" },
              { code: "SWK 201", title: "Child Welfare, Vulnerable Groups & Family Case Work" },
              { code: "SWK 202", title: "Community Organization & Social Action" }
            ]
          }
        ],
        programmes: [
          "Bachelor of Arts (B.A.) Public Administration",
          "Bachelor of Arts (B.A.) Social Work",
          "Bachelor of Arts (B.A.) Peace & Conflict Studies",
          "Bachelor of Arts (B.A.) Population & Family Life Education",
          "Diploma / HND Public Administration",
          "Diploma / HND Social Work & Community Development"
        ]
      }
    ]
  },
  {
    id: "congo-cross",
    name: "Congo Cross Campus",
    location: "Congo Cross, Freetown",
    latitude: 8.4875,
    longitude: -13.2705,
    radiusMeters: 150,
    faculties: [
      {
        id: "faculty-engineering",
        name: "Faculty of Engineering, Built Environment and Technology",
        departments: [
          {
            id: "dept-technical-studies",
            name: "Department of Technical Studies",
            modules: [
              { code: "TEC 101", title: "Technical Drawing & Computer Aided Drafting (CAD)" },
              { code: "TEC 102", title: "Workshop Technology & Industrial Safety" },
              { code: "TEC 201", title: "Applied Materials & Quality Standards" }
            ]
          },
          {
            id: "dept-automobile-eng",
            name: "Department of Automobile Engineering",
            modules: [
              { code: "AUT 101", title: "Automotive Engines & Mechanics" },
              { code: "AUT 201", title: "Automotive Electrical & Electronic Systems" },
              { code: "AUT 202", title: "Transmission, Chassis & Braking Systems" },
              { code: "AUT 301", title: "Vehicle Diagnostics & Maintenance Management" }
            ]
          },
          {
            id: "dept-marine-eng",
            name: "Department of Marine Engineering",
            modules: [
              { code: "MAR 101", title: "Marine Propulsion & Auxiliary Machinery" },
              { code: "MAR 201", title: "Naval Architecture & Ship Stability" },
              { code: "MAR 202", title: "Marine Electrical Systems & Safety at Sea" }
            ]
          },
          {
            id: "dept-mechanical-eng",
            name: "Department of Mechanical Engineering",
            modules: [
              { code: "MEC 101", title: "Engineering Mechanics & Workshop Practice" },
              { code: "MEC 201", title: "Thermodynamics & Heat Transfer" },
              { code: "MEC 202", title: "Fluid Mechanics & Turbo Machinery" },
              { code: "MEC 301", title: "Machine Design & Manufacturing Technology" }
            ]
          },
          {
            id: "dept-civil-eng",
            name: "Department of Building and Civil Engineering",
            modules: [
              { code: "CIV 101", title: "Building Construction Materials & Methods" },
              { code: "CIV 201", title: "Structural Mechanics & Reinforced Concrete Design" },
              { code: "CIV 202", title: "Hydraulics, Water Supply & Soil Mechanics" },
              { code: "CIV 301", title: "Highway Engineering & Construction Project Management" }
            ]
          },
          {
            id: "dept-electrical-eng",
            name: "Department of Electrical and Electronics Engineering",
            modules: [
              { code: "EEE 101", title: "Basic Electrical Circuit Analysis" },
              { code: "EEE 201", title: "Analogue & Digital Electronics" },
              { code: "EEE 202", title: "Electrical Power Generation, Transmission & Machines" },
              { code: "EEE 301", title: "Telecommunication Systems & Microcontrollers" }
            ]
          }
        ],
        programmes: [
          "Bachelor of Technology (B.Tech.) Automobile Engineering",
          "Bachelor of Technology (B.Tech.) Building & Civil Engineering",
          "Bachelor of Technology (B.Tech.) Electrical & Electronics Engineering",
          "Bachelor of Technology (B.Tech.) Information Technology",
          "Bachelor of Technology (B.Tech.) Mechanical Engineering",
          "Diploma / HND Automobile Engineering",
          "Diploma / HND Building & Civil Engineering",
          "Diploma / HND Electrical & Electronics Engineering",
          "Diploma / HND Marine Engineering",
          "Diploma / HND Mechanical Engineering",
          "Diploma / HND Architectural Technology",
          "Certificate in Electrical Installation",
          "Certificate in Plumbing & Metal Work / Welding",
          "Certificate in Refrigeration & Air Conditioning",
          "Certificate in Solar Electrification"
        ]
      }
    ]
  },
  {
    id: "brookfields",
    name: "Brookfields Campus",
    location: "Jomo Kenyatta Road, Brookfields",
    latitude: 8.4755,
    longitude: -13.2505,
    radiusMeters: 150,
    faculties: [
      {
        id: "faculty-hotel-tourism",
        name: "Faculty of Hotel, Tourism and Nutritional Sciences",
        departments: [
          {
            id: "dept-tourism-mgmt",
            name: "Department of Tourism Management",
            modules: [
              { code: "TRM 101", title: "Fundamentals of Tourism, Travel & Ecotourism" },
              { code: "TRM 201", title: "Tour Guiding, Destination Marketing & Heritage" },
              { code: "TRM 202", title: "Sustainable Tourism Policy & International Tourism" }
            ]
          },
          {
            id: "dept-hotel-mgmt",
            name: "Department of Hotel Management",
            modules: [
              { code: "HTM 101", title: "Introduction to Hotel Operations & Management" },
              { code: "HTM 201", title: "Commercial Catering, Menu Planning & Operations" },
              { code: "HTM 202", title: "Hospitality Cost Control & Financial Management" }
            ]
          },
          {
            id: "dept-hospitality-innovation",
            name: "Department of Hospitality Innovation",
            modules: [
              { code: "HIN 101", title: "Digital Technology & Innovation in Hospitality" },
              { code: "HIN 201", title: "Customer Experience Design & Loyalty Strategies" },
              { code: "HIN 202", title: "Green Hospitality & Smart Hotel Automation" }
            ]
          },
          {
            id: "dept-nutrition-dietetics",
            name: "Department of Nutrition and Dietetics",
            modules: [
              { code: "NUT 101", title: "Fundamentals of Human Nutrition & Food Chemistry" },
              { code: "NUT 201", title: "Clinical Dietetics & Nutritional Assessment" },
              { code: "NUT 202", title: "Public Health Nutrition & Food Security" }
            ]
          }
        ],
        programmes: [
          "Bachelor of Science (B.Sc.) Hotel & Catering Management",
          "Bachelor of Science (B.Sc.) Tourism Management",
          "Bachelor of Science (B.Sc.) Hospitality Innovation & Hotel Management",
          "Bachelor of Science (B.Sc.) Nutrition & Dietetics",
          "Diploma / HND Hotel and Catering Management",
          "Diploma / HND Tourism Management",
          "Diploma / HND Food & Beverage Production Services",
          "Diploma / HND Front Office & Housekeeping Management",
          "Certificate in Hospitality & Culinary Arts"
        ]
      },
      {
        id: "faculty-business",
        name: "Faculty of Business & Management Studies",
        departments: [
          {
            id: "dept-accounting-finance",
            name: "Department of Accounting & Finance",
            modules: [
              { code: "ACC 101", title: "Financial Accounting Principles & Reporting" },
              { code: "ACC 201", title: "Cost & Management Accounting" },
              { code: "FIN 201", title: "Corporate Finance & Investment Analysis" }
            ]
          },
          {
            id: "dept-banking-finance",
            name: "Department of Banking & Finance",
            modules: [
              { code: "BNK 101", title: "Commercial Banking & Financial Markets" },
              { code: "BNK 201", title: "Credit Appraisal, Microfinance & Risk Management" }
            ]
          },
          {
            id: "dept-business-admin",
            name: "Department of Business Administration",
            modules: [
              { code: "BUS 101", title: "Introduction to Business Management & Leadership" },
              { code: "BUS 201", title: "Strategic Management & Business Policy" },
              { code: "BUS 202", title: "Entrepreneurship, Small Business & Innovation" }
            ]
          },
          {
            id: "dept-hrm",
            name: "Department of Human Resource Management",
            modules: [
              { code: "HRM 101", title: "Fundamentals of Human Resource Management" },
              { code: "HRM 201", title: "Recruitment, Training & Performance Appraisal" }
            ]
          },
          {
            id: "dept-marketing",
            name: "Department of Marketing",
            modules: [
              { code: "MKT 101", title: "Principles of Marketing & Consumer Behaviour" },
              { code: "MKT 201", title: "Digital Marketing, Social Media & Advertising" }
            ]
          },
          {
            id: "dept-procurement",
            name: "Department of Procurement & Logistics",
            modules: [
              { code: "SCM 101", title: "Procurement Principles & Public Procurement Act" },
              { code: "SCM 201", title: "Supply Chain, Warehouse & Inventory Logistics" }
            ]
          }
        ],
        programmes: [
          "Bachelor of Science (B.Sc.) Accounting & Finance",
          "Bachelor of Science (B.Sc.) Banking & Finance",
          "Bachelor of Science (B.Sc.) Business Administration",
          "Bachelor of Science (B.Sc.) Human Resource Management",
          "Bachelor of Science (B.Sc.) Marketing",
          "Bachelor of Science (B.Sc.) Procurement & Logistics",
          "Diploma / HND Accounting & Finance",
          "Diploma / HND Banking & Finance",
          "Diploma / HND Business Administration",
          "Certificate in Business Studies & Office Practice"
        ]
      }
    ]
  }
];

// Flat list of campuses
export const CAMPUSES = CAMPUSES_DATA.map(c => ({
  id: c.id,
  name: c.name,
  location: c.location,
  latitude: c.latitude,
  longitude: c.longitude,
  radiusMeters: c.radiusMeters
}));

// Authoritative GPS Geofence Coordinates for MMTU Campuses
export const CAMPUS_COORDINATES = {
  goderich: {
    id: "goderich",
    name: "Goderich Campus",
    location: "Goderich, Freetown",
    latitude: 8.42431,
    longitude: -13.28477,
    radiusMeters: 150
  },
  "congo-cross": {
    id: "congo-cross",
    name: "Congo Cross Campus",
    location: "Congo Cross, Freetown",
    latitude: 8.4875,
    longitude: -13.2705,
    latRange: [8.487, 8.488],
    lngRange: [-13.271, -13.270],
    radiusMeters: 150
  },
  brookfields: {
    id: "brookfields",
    name: "Brookfields Campus",
    location: "Jomo Kenyatta Road, Brookfields",
    latitude: 8.4755,
    longitude: -13.2505,
    latRange: [8.475, 8.476],
    lngRange: [-13.251, -13.250],
    radiusMeters: 150
  }
};

export function getCampusCoordinates(campusIdOrLocation) {
  if (!campusIdOrLocation) return CAMPUS_COORDINATES.goderich;
  const str = String(campusIdOrLocation).toLowerCase();
  if (str.includes("congo")) return CAMPUS_COORDINATES["congo-cross"];
  if (str.includes("brookfield") || str.includes("kenyatta")) return CAMPUS_COORDINATES.brookfields;
  return CAMPUS_COORDINATES.goderich;
}

// Flat list of all faculties across all campuses (for fallback)
export const ALL_FACULTIES = CAMPUSES_DATA.flatMap(c => c.faculties);

// Academic Programme Classifications (BSc, Diploma, HND)
// Tying academic level strictly with programme:
// - BSc: Year 1 to 4 only
// - Diploma: Year 1 to 2 only
// - HND: Year 1 to 3 only
// Includes comprehensive official specification details.
export const PROGRAMME_TYPES = [
  {
    id: "bsc",
    code: "BSc",
    name: "BSc",
    label: "BSc",
    fullName: "Bachelor of Science (BSc)",
    tag: "Degree",
    badgeColor: "#0284c7",
    badgeBg: "#e0f2fe",
    minYear: 1,
    maxYear: 4,
    years: ["Year 1", "Year 2", "Year 3", "Year 4"],
    levels: [
      { value: "1", label: "Year 1" },
      { value: "2", label: "Year 2" },
      { value: "3", label: "Year 3" },
      { value: "4", label: "Year 4" }
    ],
    duration: "4 Years (8 Semesters)",
    award: "Bachelor of Science Degree (B.Sc. Hons)",
    qualification: "4-Year Undergraduate Degree",
    specification: "4-Year full undergraduate degree programme providing comprehensive academic theories, laboratory coursework, computing, and research methodology.",
    admissionRequirements: "",
    careerPathways: "Senior software engineering, data science, research scholarship, IT systems architecture, and postgraduate study (M.Sc./Ph.D.)."
  },
  {
    id: "diploma",
    code: "Diploma",
    name: "Diploma",
    label: "Diploma",
    fullName: "National Diploma (Diploma)",
    tag: "Diploma",
    badgeColor: "#d97706",
    badgeBg: "#fef3c7",
    minYear: 1,
    maxYear: 2,
    years: ["Year 1", "Year 2"],
    levels: [
      { value: "1", label: "Year 1" },
      { value: "2", label: "Year 2" }
    ],
    duration: "2 Years (4 Semesters)",
    award: "Undergraduate National Diploma",
    qualification: "2-Year Technical & Vocational Diploma",
    specification: "2-Year intensive practical diploma focused on direct vocational competencies and applied technical skills.",
    admissionRequirements: "",
    careerPathways: "Technical associate, junior system analyst, IT support specialist, or direct articulation into Year 2/Year 3 of the BSc degree."
  },
  {
    id: "hnd",
    code: "HND",
    name: "HND",
    label: "HND",
    fullName: "Higher National Diploma (HND)",
    tag: "HND",
    badgeColor: "#7c3aed",
    badgeBg: "#f5f3ff",
    minYear: 1,
    maxYear: 3,
    years: ["Year 1", "Year 2", "Year 3"],
    levels: [
      { value: "1", label: "Year 1" },
      { value: "2", label: "Year 2" },
      { value: "3", label: "Year 3" }
    ],
    duration: "3 Years (6 Semesters)",
    award: "Higher National Diploma (HND)",
    qualification: "3-Year Higher Vocational & Applied Diploma",
    specification: "3-Year advanced technical diploma emphasizing applied laboratory training, industrial attachment, and professional engineering competencies.",
    admissionRequirements: "",
    careerPathways: "Senior technical specialist, technical supervisor, operations technologist, or university degree top-up programmes."
  }
];

export function getProgrammeInfo(progCodeOrId) {
  if (!progCodeOrId) return PROGRAMME_TYPES[0];
  const clean = String(progCodeOrId).trim().toLowerCase();
  return PROGRAMME_TYPES.find(p =>
    p.id === clean ||
    p.code.toLowerCase() === clean ||
    p.name.toLowerCase() === clean ||
    clean.startsWith(p.id) ||
    clean.startsWith(p.code.toLowerCase())
  ) || PROGRAMME_TYPES[0];
}

export function getLevelsForProgramme(progCodeOrId) {
  const prog = getProgrammeInfo(progCodeOrId);
  return prog ? prog.levels : PROGRAMME_TYPES[0].levels;
}

// Tie Campus directly with Departments across all faculties
export function getDepartmentsByCampus(campusId) {
  const campus = CAMPUSES_DATA.find(c => c.id === campusId);
  if (!campus) return [];
  const list = [];
  campus.faculties.forEach(fac => {
    fac.departments.forEach(dept => {
      list.push({
        id: dept.id,
        name: dept.name,
        facultyId: fac.id,
        facultyName: fac.name,
        campusId: campus.id,
        campusName: campus.name,
        modules: dept.modules || []
      });
    });
  });
  return list;
}

// Get faculties under a specific campus
export function getFacultiesByCampusId(campusId) {
  const campus = CAMPUSES_DATA.find(c => c.id === campusId);
  return campus ? campus.faculties : [];
}

// Get departments under a specific faculty in a campus
export function getDepartmentsByCampusAndFaculty(campusId, facultyId) {
  const faculties = getFacultiesByCampusId(campusId);
  const fac = faculties.find(f => f.id === facultyId);
  return fac ? fac.departments : [];
}

// Get programmes under a specific faculty in a campus
export function getProgrammesByCampusAndFaculty(campusId, facultyId) {
  const faculties = getFacultiesByCampusId(campusId);
  const fac = faculties.find(f => f.id === facultyId);
  return fac ? fac.programmes : [];
}

// Get all modules belonging to a faculty (aggregated from all departments in that faculty)
export function getModulesByCampusAndFaculty(campusId, facultyId) {
  const depts = getDepartmentsByCampusAndFaculty(campusId, facultyId);
  const list = [];
  depts.forEach(dept => {
    dept.modules.forEach(m => {
      if (!list.some(x => x.code === m.code)) list.push(m);
    });
  });
  return list;
}

// Get modules for a specific department
export function getModulesByCampusFacultyDept(campusId, facultyId, departmentId) {
  const depts = getDepartmentsByCampusAndFaculty(campusId, facultyId);
  const dept = depts.find(d => d.id === departmentId);
  return dept ? dept.modules : [];
}

// Backwards-compatible wrappers
export function getDepartmentsByFacultyId(facultyId) {
  const fac = ALL_FACULTIES.find(f => f.id === facultyId);
  return fac ? fac.departments : [];
}

export function getProgrammesByFacultyId(facultyId) {
  const fac = ALL_FACULTIES.find(f => f.id === facultyId);
  return fac ? fac.programmes : [];
}

export function getModulesByFacultyId(facultyId) {
  const fac = ALL_FACULTIES.find(f => f.id === facultyId);
  if (!fac) return [];
  const list = [];
  fac.departments.forEach(dept => {
    dept.modules.forEach(m => {
      if (!list.some(x => x.code === m.code)) list.push(m);
    });
  });
  return list;
}

export function getModulesByDepartmentId(facultyId, departmentId) {
  const depts = getDepartmentsByFacultyId(facultyId);
  const dept = depts.find(d => d.id === departmentId);
  return dept ? dept.modules : [];
}

/**
 * Returns curriculum modules for a student based on:
 * faculty + department + program + Level + semester.
 * Rule: If student fills in level 2 academic information, show all modules for level 3 and lecturers alone.
 * Provides 8 or 9 modules per semester.
 */
export function getCurriculumModules({ campusId, facultyId, departmentId, programme, level, semester } = {}) {
  // If student fills in level 2 academic information, show level 3 modules
  const rawLevelNum = Number(level);
  const effectiveLevel = rawLevelNum === 2 ? 3 : (rawLevelNum || 3);
  const effectiveSemester = (semester && semester.toLowerCase().includes('second')) ? 'Second Semester' : 'First Semester';

  // Find department across campuses or faculties
  let allDepts = [];
  if (campusId && facultyId) {
    allDepts = getDepartmentsByCampusAndFaculty(campusId, facultyId);
  } else if (campusId) {
    allDepts = getDepartmentsByCampus(campusId);
  } else if (facultyId) {
    allDepts = getDepartmentsByFacultyId(facultyId);
  } else {
    allDepts = ALL_FACULTIES.flatMap(f => f.departments);
  }

  const dept = allDepts.find(d => d.id === departmentId || (departmentId && d.name.toLowerCase().includes(departmentId.toLowerCase())));
  const modulesList = dept ? dept.modules : [];

  // Filter modules by effectiveLevel and effectiveSemester
  let filtered = modulesList.filter(m => {
    const matchesLevel = m.level ? Number(m.level) === effectiveLevel : true;
    const matchesSem = m.semester ? m.semester.toLowerCase() === effectiveSemester.toLowerCase() : true;
    return matchesLevel && matchesSem;
  });

  // If no level/semester tag on modules or fewer than 8, expand/fallback to department modules
  if (!filtered.length && modulesList.length) {
    filtered = modulesList;
  }

  // Ensure default lecturer assigned if not present
  return filtered.map((m, idx) => ({
    ...m,
    effectiveLevel,
    effectiveSemester,
    lecturerName: m.lecturerName || (effectiveLevel === 3 ? 'Peter Saffa' : `Lecturer ${idx + 1}`),
    lecturerId: m.lecturerId || (effectiveLevel === 3 ? 'LECT-2026-790380' : `LECT-2026-${1000 + idx}`)
  }));
}

/**
 * Returns official available modules for a lecturer to select and teach,
 * filtered by faculty, department, level, and semester.
 * Strictly prevents arbitrary freeform module creation.
 */
export function getAvailableModulesForLecturer({ campusId, facultyId, departmentId, level, semester } = {}) {
  let depts = [];
  if (campusId && facultyId) {
    depts = getDepartmentsByCampusAndFaculty(campusId, facultyId);
  } else if (campusId) {
    depts = getDepartmentsByCampus(campusId);
  } else if (facultyId) {
    depts = getDepartmentsByFacultyId(facultyId);
  } else {
    depts = ALL_FACULTIES.flatMap(f => f.departments);
  }

  if (departmentId) {
    depts = depts.filter(d => d.id === departmentId || d.name.toLowerCase().includes(departmentId.toLowerCase()));
  }

  const allMods = depts.flatMap(d => d.modules || []);
  const targetLevel = level ? Number(level) : null;
  const targetSem = semester ? String(semester).trim().toLowerCase() : null;

  return allMods.filter(m => {
    if (targetLevel && m.level && Number(m.level) !== targetLevel) return false;
    if (targetSem && m.semester && !m.semester.toLowerCase().includes(targetSem.includes('second') ? 'second' : 'first')) return false;
    return true;
  });
}

