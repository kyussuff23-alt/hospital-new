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
        <button
          className="btn btn-sm btn-warning me-2"
          onClick={() => onUpdateClick(enrollee)}
        >
          Update
        </button>
      </td>
    </tr>
  );
});

export default EnrolleeRow;
