let patients = [
  {
    id: "pat-1",
    name: "John Doe",
    age: 38,
    gender: "Male",
    bloodGroup: "O+",
    phone: "+1 (555) 789-0123",
    email: "john.doe@example.com",
    lastVisit: "2026-10-24",
    status: "Active",
    condition: "Hypertension Checkup"
  },
  {
    id: "pat-2",
    name: "Sarah Jenkins",
    age: 29,
    gender: "Female",
    bloodGroup: "A+",
    phone: "+1 (555) 890-1234",
    email: "sarah.j@example.com",
    lastVisit: "2026-10-26",
    status: "Active",
    condition: "Post-op Followup"
  },
  {
    id: "pat-3",
    name: "Robert Davis",
    age: 54,
    gender: "Male",
    bloodGroup: "B-",
    phone: "+1 (555) 901-2345",
    email: "rdavis@example.com",
    lastVisit: "2026-10-20",
    status: "Discharged",
    condition: "Cardiac Rehab"
  }
];

export const getPatients = (req, res) => {
  res.json({ success: true, count: patients.length, data: patients });
};

export const getPatientById = (req, res) => {
  const patient = patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ success: false, message: "Patient not found" });
  }
  res.json({ success: true, data: patient });
};

export const createPatient = (req, res) => {
  const newPatient = {
    id: `pat-${Date.now()}`,
    ...req.body
  };
  patients.push(newPatient);
  res.status(201).json({ success: true, data: newPatient });
};
