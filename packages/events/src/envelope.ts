export type DomainEvent<T> = {
  id: string;
  type: string;
  occurredAt: string;
  payload: T;
};
