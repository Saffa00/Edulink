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
              { code: "CS 101", title: "Introduction to Computer Systems & Algorithms" },
              { code: "C++ 101", title: "C++ Object-Oriented Programming" },
              { code: "CS 201", title: "Data Structures & Database Management Systems" },
              { code: "CS 302", title: "Distributed & Concurrent Systems" },
              { code: "CSOR 224", title: "Operations Research & Optimization" },
              { code: "CS 401", title: "Research Methods in Software Engineering" }
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
              { code: "PBH 101", title: "Introduction to Epidemiology & Disease Control" },
              { code: "PBH 201", title: "Environmental Sanitation, Water Quality & Hygiene" },
              { code: "PBH 202", title: "Health Promotion, Policy & Community Health" }
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
