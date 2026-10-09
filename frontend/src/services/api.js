import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getProducts = async () => {
  const response = await api.get("/products");

  return response.data;
};

export const createQuotationRevision = async (quotationId) => {
  const response = await api.post(
    `/quotations/${quotationId}/revisions`
  );

  return response.data;
};

export const getQuotationRevisions = async (quotationId) => {
  const response = await api.get(
    `/quotations/${quotationId}/revisions`
  );

  return response.data;
};
export const compareQuotationRevisions = async (
  quotationId,
  revisionFrom,
  revisionTo
) => {
  const response = await api.get(
    `/quotations/${quotationId}/revisions/compare`,
    {
      params: {
        revision_from: revisionFrom,
        revision_to: revisionTo,
      },
    }
  );

  return response.data;
};
export const getQuotationAuditLogs = async (quotationId) => {
  const response = await api.get(`/audit-logs/${quotationId}`);
  return response.data;
};
export const updateQuotationRevision = async (
  quotationId,
  revisionNumber,
  data
) => {
  const response = await api.put(
    `/quotations/${quotationId}/revisions/${revisionNumber}`,
    data
  );

  return response.data;
};

export const updateRevisionStatus = async (
  quotationId,
  revisionNumber,
  status
) => {
  const response = await api.patch(
    `/quotations/${quotationId}/revisions/${revisionNumber}/status`,
    {
      status,
    }
  );

  return response.data;
};

export default api;


export const downloadRevisionPdf = async (
  quotationId,
  revisionNumber
) => {
  const response = await api.get(
    `/quotations/${quotationId}/revisions/${revisionNumber}/pdf`,
    {
      responseType: "blob",
    }
  );

  return response.data;
};