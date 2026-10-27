let appointments = [
  {
    id: "apt-101",
    patientName: "John Doe",
    patientId: "pat-1",
    doctorName: "Dr. Sarah Johnson",
    doctorId: "doc-1",
    department: "Cardiology",
    date: "2026-10-28",
    time: "10:30 AM",
    status: "Confirmed",
    type: "In-Person",
    fee: "$120"
  },
  {
    id: "apt-102",
    patientName: "Sarah Jenkins",
    patientId: "pat-2",
    doctorName: "Dr. Michael Chen",
    doctorId: "doc-2",
    department: "Neurology",
    date: "2026-10-28",
    time: "11:45 AM",
    status: "Pending",
    type: "Video Call",
    fee: "$90"
  },
  {
    id: "apt-103",
    patientName: "Alice Miller",
    patientId: "pat-4",
    doctorName: "Dr. Emily Taylor",
    doctorId: "doc-3",
    department: "Pediatrics",
    date: "2026-10-28",
    time: "02:15 PM",
    status: "Confirmed",
    type: "In-Person",
    fee: "$100"
  }
];

export const getAppointments = (req, res) => {
  res.json({ success: true, count: appointments.length, data: appointments });
};

export const createAppointment = (req, res) => {
  const newAppointment = {
    id: `apt-${Date.now()}`,
    status: "Confirmed",
    ...req.body
  };
  appointments.push(newAppointment);
  res.status(201).json({ success: true, data: newAppointment });
};

export const updateAppointmentStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const appointment = appointments.find((a) => a.id === id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: "Appointment not found" });
  }
  appointment.status = status || appointment.status;
  res.json({ success: true, data: appointment });
};
