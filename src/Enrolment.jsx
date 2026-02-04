import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import RegisterEnrollee from "./RegisterEnrollee";
import UpdateEnrollee from "./UpdateEnrollee";

export default function Enrolment() {
  const [enrollees, setEnrollees] = useState([]);
  const [selectedEnrollee, setSelectedEnrollee] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // ✅ Fetch enrollee list on mount
  useEffect(() => {
    fetchEnrollees();
  }, []);

  async function fetchEnrollees() {
    const { data, error } = await supabase
      .from("myenrolment")
      .select("*")
      .order("id");

    if (error) {
      console.error("Error fetching enrolments:", error);
    } else {
      setEnrollees(data);
    }
  }

  // ✅ Handle opening update modal
  function handleUpdateClick(enrollee) {
    setSelectedEnrollee(enrollee);
    setShowUpdateModal(true);
  }

  return (
    <div className="container mt-4">
      {/* Action buttons */}
      <div className="d-flex justify-content-between mb-3">
        <button
          className="btn btn-primary"
          onClick={() => setShowRegisterModal(true)}
        >
          ➕ Register Enrollee
        </button>

        <button
          className="btn btn-success"
          onClick={() => alert("Bulk upload feature coming soon!")}
        >
          📂 Upload Bulk
        </button>
      </div>

      {/* Enrollee table */}
      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th>S/N</th>
            <th>Client</th>
            <th>Enrollee Name</th>
            <th>Policy ID</th>
            <th>Old Policy</th>
            <th>Family Status</th>
            <th>Plan</th>
            <th>Provider</th>
            <th>Gender</th>
            <th>Marital Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {enrollees.map((e, i) => (
            <tr key={e.id}>
              <td>{i + 1}</td>
              <td>{e.client}</td>
              <td>{e.enrolleename}</td>
              <td>{e.policyid}</td>
              <td>{e.oldpolicy}</td>
              <td>{e.familystatus}</td>
              <td>{e.plan}</td>
              <td>{e.provider}</td>
              <td>{e.gender}</td>
              <td>{e.maritalstatus}</td>
              <td>
                <button
                  className="btn btn-sm btn-warning me-2"
                  onClick={() => handleUpdateClick(e)}
                >
                  Update
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Register Modal */}
      {showRegisterModal && (
        <RegisterEnrollee
          show={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onRegistered={fetchEnrollees}
        />
      )}

      {/* ✅ Update Modal */}
      {showUpdateModal && selectedEnrollee && (
        <UpdateEnrollee
          enrollee={selectedEnrollee}
          show={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={fetchEnrollees}
        />
      )}
    </div>
  );
}
