import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Account_Key {
  id: string;
  __typename?: 'Account_Key';
}

export interface ApiKey_Key {
  id: string;
  __typename?: 'ApiKey_Key';
}

export interface App_Key {
  slug: string;
  __typename?: 'App_Key';
}

export interface Attendee_Key {
  id: number;
  __typename?: 'Attendee_Key';
}

export interface Availability_Key {
  id: number;
  __typename?: 'Availability_Key';
}

export interface BookingReference_Key {
  id: number;
  __typename?: 'BookingReference_Key';
}

export interface BookingSeat_Key {
  id: number;
  __typename?: 'BookingSeat_Key';
}

export interface Booking_Key {
  id: number;
  __typename?: 'Booking_Key';
}

export interface CalendarCache_Key {
  key: string;
  credentialId: number;
  __typename?: 'CalendarCache_Key';
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  username: string;
  name?: string | null;
  email: string;
  uid: string;
  uuid: UUIDString;
  created: TimestampString;
}

export interface Credential_Key {
  id: number;
  __typename?: 'Credential_Key';
}

export interface DestinationCalendar_Key {
  id: number;
  __typename?: 'DestinationCalendar_Key';
}

export interface EventType_Key {
  id: number;
  __typename?: 'EventType_Key';
}

export interface Feature_Key {
  slug: string;
  __typename?: 'Feature_Key';
}

export interface GetBookingByIdData {
  booking?: {
    id: number;
    uid: string;
    title: string;
    startTime: TimestampString;
    endTime: TimestampString;
    status: string;
    location?: string | null;
    userId?: number | null;
    eventTypeId?: number | null;
    description?: string | null;
    createdAt: TimestampString;
  } & Booking_Key;
}

export interface GetBookingByIdVariables {
  id: number;
}

export interface GetUserCredentialsData {
  credentials: ({
    id: number;
    type: string;
    appId?: string | null;
    userId?: number | null;
  } & Credential_Key)[];
}

export interface GetUserCredentialsVariables {
  userId: number;
}

export interface GetUserData {
  user?: {
    id: number;
    username?: string | null;
    name?: string | null;
    email: string;
    timeZone: string;
    locale?: string | null;
  } & User_Key;
}

export interface GetUserVariables {
  id: number;
}

export interface ListBookingsData {
  bookings: ({
    id: number;
    uid: string;
    title: string;
    startTime: TimestampString;
    endTime: TimestampString;
    status: string;
    userId?: number | null;
    eventTypeId?: number | null;
  } & Booking_Key)[];
}

export interface ListTeamsData {
  teams: ({
    id: number;
    name: string;
    slug?: string | null;
    createdAt: TimestampString;
  } & Team_Key)[];
}

export interface ListUsersData {
  users: ({
    id: number;
    username?: string | null;
    name?: string | null;
    email: string;
    timeZone: string;
  } & User_Key)[];
}

export interface Membership_Key {
  id: number;
  __typename?: 'Membership_Key';
}

export interface OutOfOfficeEntry_Key {
  id: number;
  __typename?: 'OutOfOfficeEntry_Key';
}

export interface OutOfOfficeReason_Key {
  id: number;
  __typename?: 'OutOfOfficeReason_Key';
}

export interface Payment_Key {
  id: number;
  __typename?: 'Payment_Key';
}

export interface Profile_Key {
  id: number;
  __typename?: 'Profile_Key';
}

export interface Schedule_Key {
  id: number;
  __typename?: 'Schedule_Key';
}

export interface SecondaryEmail_Key {
  id: number;
  __typename?: 'SecondaryEmail_Key';
}

export interface SelectedCalendar_Key {
  id: string;
  __typename?: 'SelectedCalendar_Key';
}

export interface Session_Key {
  id: string;
  __typename?: 'Session_Key';
}

export interface Team_Key {
  id: number;
  __typename?: 'Team_Key';
}

export interface User_Key {
  id: number;
  __typename?: 'User_Key';
}

export interface VerificationToken_Key {
  id: number;
  __typename?: 'VerificationToken_Key';
}

export interface Webhook_Key {
  id: string;
  __typename?: 'Webhook_Key';
}

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;
export function createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface ListUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
  operationName: string;
}
export const listUsersRef: ListUsersRef;

export function listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;
export function listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListTeamsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTeamsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTeamsData, undefined>;
  operationName: string;
}
export const listTeamsRef: ListTeamsRef;

export function listTeams(options?: ExecuteQueryOptions): QueryPromise<ListTeamsData, undefined>;
export function listTeams(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTeamsData, undefined>;

interface GetUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
  operationName: string;
}
export const getUserRef: GetUserRef;

export function getUser(vars: GetUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserData, GetUserVariables>;
export function getUser(dc: DataConnect, vars: GetUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserData, GetUserVariables>;

interface ListBookingsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListBookingsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListBookingsData, undefined>;
  operationName: string;
}
export const listBookingsRef: ListBookingsRef;

export function listBookings(options?: ExecuteQueryOptions): QueryPromise<ListBookingsData, undefined>;
export function listBookings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListBookingsData, undefined>;

interface GetBookingByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetBookingByIdVariables): QueryRef<GetBookingByIdData, GetBookingByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetBookingByIdVariables): QueryRef<GetBookingByIdData, GetBookingByIdVariables>;
  operationName: string;
}
export const getBookingByIdRef: GetBookingByIdRef;

export function getBookingById(vars: GetBookingByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetBookingByIdData, GetBookingByIdVariables>;
export function getBookingById(dc: DataConnect, vars: GetBookingByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetBookingByIdData, GetBookingByIdVariables>;

interface GetUserCredentialsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserCredentialsVariables): QueryRef<GetUserCredentialsData, GetUserCredentialsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserCredentialsVariables): QueryRef<GetUserCredentialsData, GetUserCredentialsVariables>;
  operationName: string;
}
export const getUserCredentialsRef: GetUserCredentialsRef;

export function getUserCredentials(vars: GetUserCredentialsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserCredentialsData, GetUserCredentialsVariables>;
export function getUserCredentials(dc: DataConnect, vars: GetUserCredentialsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserCredentialsData, GetUserCredentialsVariables>;

