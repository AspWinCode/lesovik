import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addGroupMember,
  applyGroupRoles,
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  removeGroupMember,
  updateGroup,
  type GroupCreate,
  type GroupUpdate,
} from "../api/groups";

const GROUPS_KEY = ["groups"] as const;

export function useGroups() {
  return useQuery({ queryKey: GROUPS_KEY, queryFn: listGroups });
}

export function useGroup(groupId: string | null) {
  return useQuery({
    queryKey: [...GROUPS_KEY, groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupCreate) => createGroup(body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: GROUPS_KEY }); },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, body }: { groupId: string; body: GroupUpdate }) => updateGroup(groupId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: GROUPS_KEY }); },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: GROUPS_KEY }); },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) => addGroupMember(groupId, userId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: GROUPS_KEY }); },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) => removeGroupMember(groupId, userId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: GROUPS_KEY }); },
  });
}

export function useApplyGroupRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => applyGroupRoles(groupId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: GROUPS_KEY }); },
  });
}
