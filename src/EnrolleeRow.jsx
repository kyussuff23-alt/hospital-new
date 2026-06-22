import React from "react";

const EnrolleeRow = React.memo(function EnrolleeRow({ enrollee, index, onUpdateClick }) {
  return (
    <tr>
      <td>{index + 1}</td>
      <td>{enrollee.client}</td>
      <td>{enrollee.enrolleename}</td>
      <td>{enrollee.policyid}</td>
      <td>{enrollee.oldpolicy}</td>
      <td>{enrollee.familystatus}</td>
      <td>{enrollee.plan}</td>
      <td>{enrollee.provider}</td>
      <td>{enrollee.gender}</td>
      <td>{enrollee.maritalstatus}</td>
      <td>
    {/* ⚠️ CORRECTION: Transformed the small warning button layout into an elegant inline action link */}
{/* ⚠️ CORRECTION: Transformed the warning layout into a clean primary blue action link */}
<span
  className="text-primary fw-medium d-inline-flex align-items-center small"
  style={{ cursor: "pointer", transition: "color 0.2s ease" }}
  onClick={() => onUpdateClick(enrollee)}
  onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")} // Darker dashboard blue on hover
  onMouseLeave={(e) => (e.currentTarget.style.color = "")}
>
  <i className="bi bi-pencil-square me-1"></i> Update
</span>

      </td>
    </tr>
  );
});

export default EnrolleeRow;
