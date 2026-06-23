import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrg,
  listOrgs,
  updateOrg,
  type OrgCreate,
  type OrgUpdate,
} from "../api/orgs";

const ORGS_KEY = ["orgs"] as const;

export function useOrgs() {
  return useQuery({
    queryKey: ORGS_KEY,
    queryFn: listOrgs,
  });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrgCreate) => createOrg(body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ORGS_KEY }); },
  });
}

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, body }: { orgId: string; body: OrgUpdate }) =>
      updateOrg(orgId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ORGS_KEY }); },
  });
}
