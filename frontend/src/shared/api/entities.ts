import { apiClient } from "./client";

export type FieldType =
  | "text" | "long_text" | "rich_text"
  | "number" | "decimal" | "boolean"
  | "date" | "datetime" | "time"
  | "select" | "multi_select"
  | "file" | "image" | "relation"
  | "formula" | "currency" | "signature"
  | "url" | "email" | "phone"
  | "json" | "lookup";

export interface FieldRead {
  id: string;
  entity_id: string;
  app_id: string;
  name: string;
  display_name: string;
  field_type: FieldType;
  is_required: boolean;
  is_unique: boolean;
  is_system: boolean;
  is_indexed: boolean;
  default_value: unknown | null;
  validation_rules: Record<string, unknown>;
  field_options: Record<string, unknown>;
  formula_definition: Record<string, unknown> | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface EntityRead {
  id: string;
  app_id: string;
  slug: string;
  display_name: string;
  name_plural: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  settings: Record<string, unknown>;
  is_system: boolean;
  field_order: string[];
  fields: FieldRead[];
  created_at: string;
  updated_at: string;
}

export interface EntityCreate {
  slug: string;
  display_name: string;
  name_plural?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  settings?: Record<string, unknown>;
}

export interface EntityUpdate {
  display_name?: string;
  name_plural?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  settings?: Record<string, unknown>;
}

export interface FieldCreate {
  name: string;
  display_name: string;
  field_type: FieldType;
  is_required?: boolean;
  is_unique?: boolean;
  is_indexed?: boolean;
  default_value?: unknown | null;
  validation_rules?: Record<string, unknown>;
  field_options?: Record<string, unknown>;
  formula_definition?: Record<string, unknown> | null;
}

export interface FieldUpdate {
  display_name?: string;
  is_required?: boolean;
  is_unique?: boolean;
  is_indexed?: boolean;
  default_value?: unknown | null;
  validation_rules?: Record<string, unknown>;
  field_options?: Record<string, unknown>;
  formula_definition?: Record<string, unknown> | null;
}

export async function listEntities(appId: string): Promise<EntityRead[]> {
  const { data } = await apiClient.get<EntityRead[]>(`/apps/${appId}/entities`);
  return data;
}

export async function getEntity(appId: string, entityId: string): Promise<EntityRead> {
  const { data } = await apiClient.get<EntityRead>(`/apps/${appId}/entities/${entityId}`);
  return data;
}

export async function createEntity(appId: string, body: EntityCreate): Promise<EntityRead> {
  const { data } = await apiClient.post<EntityRead>(`/apps/${appId}/entities`, body);
  return data;
}

export async function updateEntity(appId: string, entityId: string, body: EntityUpdate): Promise<EntityRead> {
  const { data } = await apiClient.patch<EntityRead>(`/apps/${appId}/entities/${entityId}`, body);
  return data;
}

export async function deleteEntity(appId: string, entityId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/entities/${entityId}`);
}

export async function createField(appId: string, entityId: string, body: FieldCreate): Promise<FieldRead> {
  const { data } = await apiClient.post<FieldRead>(
    `/apps/${appId}/entities/${entityId}/fields`,
    body,
  );
  return data;
}

export async function updateField(
  appId: string,
  entityId: string,
  fieldId: string,
  body: FieldUpdate,
): Promise<FieldRead> {
  const { data } = await apiClient.patch<FieldRead>(
    `/apps/${appId}/entities/${entityId}/fields/${fieldId}`,
    body,
  );
  return data;
}

export async function deleteField(appId: string, entityId: string, fieldId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/entities/${entityId}/fields/${fieldId}`);
}

/* ── Relations ── */

export type RelationType = "one_to_one" | "one_to_many" | "many_to_many";

export interface RelationRead {
  id: string;
  app_id: string;
  from_entity_id: string;
  to_entity_id: string;
  relation_type: RelationType;
  from_field_name: string;
  to_field_name: string | null;
  display_name: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface RelationCreate {
  from_entity_id: string;
  to_entity_id: string;
  relation_type: RelationType;
  from_field_name: string;
  to_field_name?: string | null;
  display_name?: string | null;
  settings?: Record<string, unknown>;
}

export async function listRelations(appId: string): Promise<RelationRead[]> {
  const { data } = await apiClient.get<RelationRead[]>(`/apps/${appId}/relations`);
  return data;
}

export async function createRelation(appId: string, body: RelationCreate): Promise<RelationRead> {
  const { data } = await apiClient.post<RelationRead>(`/apps/${appId}/relations`, body);
  return data;
}

export async function deleteRelation(appId: string, relationId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/relations/${relationId}`);
}
