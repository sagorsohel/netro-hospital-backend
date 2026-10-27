let doctors = [
  {
    id: "doc-1",
    name: "Dr. Sarah Johnson",
    specialty: "Cardiology",
    experience: "12 years",
    rating: 4.9,
    availability: "Available Today",
    phone: "+1 (555) 234-5678",
    email: "sarah.johnson@netrohospital.com",
    department: "Cardiology",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80"
  },
  {
    id: "doc-2",
    name: "Dr. Michael Chen",
    specialty: "Neurology",
    experience: "15 years",
    rating: 4.8,
    availability: "Available Tomorrow",
    phone: "+1 (555) 345-6789",
    email: "michael.chen@netrohospital.com",
    department: "Neurology",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&q=80"
  },
  {
    id: "doc-3",
    name: "Dr. Emily Taylor",
    specialty: "Pediatrics",
    experience: "8 years",
    rating: 4.95,
    availability: "Available Today",
    phone: "+1 (555) 456-7890",
    email: "emily.taylor@netrohospital.com",
    department: "Pediatrics",
    image: "https://images.unsplash.com/photo-1594824813575-d227b94b05a7?w=300&q=80"
  },
  {
    id: "doc-4",
    name: "Dr. James Wilson",
    specialty: "Orthopedics",
    experience: "10 years",
    rating: 4.7,
    availability: "Next Mon",
    phone: "+1 (555) 567-8901",
    email: "james.wilson@netrohospital.com",
    department: "Orthopedics",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&q=80"
  }
];

export const getDoctors = (req, res) => {
  res.json({ success: true, count: doctors.length, data: doctors });
};

export const getDoctorById = (req, res) => {
  const doctor = doctors.find((d) => d.id === req.params.id);
  if (!doctor) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }
  res.json({ success: true, data: doctor });
};

export const createDoctor = (req, res) => {
  const newDoctor = {
    id: `doc-${Date.now()}`,
    ...req.body
  };
  doctors.push(newDoctor);
  res.status(201).json({ success: true, data: newDoctor });
};
