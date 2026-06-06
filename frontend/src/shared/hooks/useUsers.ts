import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  deactivateUser,
  listRoles,
  listUsers,
  updateUser,
  type UserCreate,
  type UserListParams,
  type UserUpdate,
} from "../api/users";

const USERS_KEY = ["users"] as const;
const ROLES_KEY = ["users", "roles"] as const;

export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: [...USERS_KEY, params],
    queryFn: () => listUsers(params),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: listRoles,
    staleTime: 5 * 60 * 1000, // roles rarely change
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserCreate) => createUser(body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UserUpdate }) =>
      updateUser(userId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
}
