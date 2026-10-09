import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  compareQuotationRevisions,
} from "../services/api";

const RevisionCompare = () => {
  const {
    quotationId,
    revisionFrom,
    revisionTo,
  } = useParams();

  const navigate = useNavigate();

  const [comparison, setComparison] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadComparison();
  }, [
    quotationId,
    revisionFrom,
    revisionTo,
  ]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await compareQuotationRevisions(
          quotationId,
          revisionFrom,
          revisionTo
        );

      setComparison(data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Failed to compare revisions."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2>Comparing revisions...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">

        <h2>
          Revision Comparison
        </h2>

        <div className="error-message">
          {error}
        </div>

        <button
          onClick={() =>
            navigate(
              `/quotations/${quotationId}`
            )
          }
        >
          Back to Quotation
        </button>

      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Revision Comparison
          </h1>

          <p>
            Revision #{revisionFrom}
            {" → "}
            Revision #{revisionTo}
          </p>
        </div>

        <button
          onClick={() =>
            navigate(
              `/quotations/${quotationId}`
            )
          }
        >
          Back to Quotation
        </button>

      </div>

      {/* Summary */}

      <div className="card">

        <h2>Summary</h2>

        <p>
          Previous Total:{" "}
          <strong>
            ₹
            {Number(
              comparison.from_grand_total || 0
            ).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </strong>
        </p>

        <p>
          New Total:{" "}
          <strong>
            ₹
            {Number(
              comparison.to_grand_total || 0
            ).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </strong>
        </p>

        <p>
          Difference:{" "}
          <strong>
            ₹
            {Number(
              comparison.grand_total_difference || 0
            ).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </strong>
        </p>

      </div>

      {/* Added Items */}

      <div className="card">

        <h2>Added Products</h2>

        {comparison.added_items?.length ? (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>

              <tbody>

                {comparison.added_items.map(
                  (item, index) => (
                    <tr key={index}>

                      <td>
                        {item.product_name}
                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        ₹
                        {Number(
                          item.unit_price || 0
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <p>No products added.</p>
        )}

      </div>

      {/* Removed Items */}

      <div className="card">

        <h2>Removed Products</h2>

        {comparison.removed_items?.length ? (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>

              <tbody>

                {comparison.removed_items.map(
                  (item, index) => (
                    <tr key={index}>

                      <td>
                        {item.product_name}
                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        ₹
                        {Number(
                          item.unit_price || 0
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <p>No products removed.</p>
        )}

      </div>

      {/* Changed Items */}

      <div className="card">

        <h2>Changed Products</h2>

        {comparison.changed_items?.length ? (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Previous</th>
                  <th>New</th>
                </tr>
              </thead>

              <tbody>

                {comparison.changed_items.map(
                  (item, index) => (
                    <tr key={index}>

                      <td>
                        {item.product_name}
                      </td>

                      <td>
                        Qty:{" "}
                        {item.from_quantity}
                        <br />

                        Price: ₹
                        {Number(
                          item.from_unit_price || 0
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}

                        <br />

                        Discount:{" "}
                        {item.from_discount_percent}%
                      </td>

                      <td>
                        Qty:{" "}
                        {item.to_quantity}
                        <br />

                        Price: ₹
                        {Number(
                          item.to_unit_price || 0
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}

                        <br />

                        Discount:{" "}
                        {item.to_discount_percent}%
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <p>No products changed.</p>
        )}

      </div>

    </div>
  );
};

export default RevisionCompare;