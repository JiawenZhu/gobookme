# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListUsers*](#listusers)
  - [*ListTeams*](#listteams)
  - [*GetUser*](#getuser)
  - [*ListBookings*](#listbookings)
  - [*GetBookingById*](#getbookingbyid)
  - [*GetUserCredentials*](#getusercredentials)
- [**Mutations**](#mutations)
  - [*CreateUser*](#createuser)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@gobookme/sdk` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@gobookme/sdk';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@gobookme/sdk';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListUsers
You can execute the `ListUsers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listUsersRef:
```typescript
const name = listUsersRef.operationName;
console.log(name);
```

### Variables
The `ListUsers` query has no variables.
### Return Type
Recall that executing the `ListUsers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListUsersData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListUsersData {
  users: ({
    id: number;
    username?: string | null;
    name?: string | null;
    email: string;
    timeZone: string;
  } & User_Key)[];
}
```
### Using `ListUsers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listUsers } from '@gobookme/sdk';


// Call the `listUsers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listUsers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listUsers(dataConnect);

console.log(data.users);

// Or, you can use the `Promise` API.
listUsers().then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `ListUsers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listUsersRef } from '@gobookme/sdk';


// Call the `listUsersRef()` function to get a reference to the query.
const ref = listUsersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listUsersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## ListTeams
You can execute the `ListTeams` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listTeams(options?: ExecuteQueryOptions): QueryPromise<ListTeamsData, undefined>;

interface ListTeamsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTeamsData, undefined>;
}
export const listTeamsRef: ListTeamsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTeams(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTeamsData, undefined>;

interface ListTeamsRef {
  ...
  (dc: DataConnect): QueryRef<ListTeamsData, undefined>;
}
export const listTeamsRef: ListTeamsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTeamsRef:
```typescript
const name = listTeamsRef.operationName;
console.log(name);
```

### Variables
The `ListTeams` query has no variables.
### Return Type
Recall that executing the `ListTeams` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTeamsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTeamsData {
  teams: ({
    id: number;
    name: string;
    slug?: string | null;
    createdAt: TimestampString;
  } & Team_Key)[];
}
```
### Using `ListTeams`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTeams } from '@gobookme/sdk';


// Call the `listTeams()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTeams();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTeams(dataConnect);

console.log(data.teams);

// Or, you can use the `Promise` API.
listTeams().then((response) => {
  const data = response.data;
  console.log(data.teams);
});
```

### Using `ListTeams`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTeamsRef } from '@gobookme/sdk';


// Call the `listTeamsRef()` function to get a reference to the query.
const ref = listTeamsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTeamsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.teams);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.teams);
});
```

## GetUser
You can execute the `GetUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getUser(vars: GetUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserData, GetUserVariables>;

interface GetUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
}
export const getUserRef: GetUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUser(dc: DataConnect, vars: GetUserVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserData, GetUserVariables>;

interface GetUserRef {
  ...
  (dc: DataConnect, vars: GetUserVariables): QueryRef<GetUserData, GetUserVariables>;
}
export const getUserRef: GetUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserRef:
```typescript
const name = getUserRef.operationName;
console.log(name);
```

### Variables
The `GetUser` query requires an argument of type `GetUserVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUser, GetUserVariables } from '@gobookme/sdk';

// The `GetUser` query requires an argument of type `GetUserVariables`:
const getUserVars: GetUserVariables = {
  id: ..., 
};

// Call the `getUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUser(getUserVars);
// Variables can be defined inline as well.
const { data } = await getUser({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUser(dataConnect, getUserVars);

console.log(data.user);

// Or, you can use the `Promise` API.
getUser(getUserVars).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserRef, GetUserVariables } from '@gobookme/sdk';

// The `GetUser` query requires an argument of type `GetUserVariables`:
const getUserVars: GetUserVariables = {
  id: ..., 
};

// Call the `getUserRef()` function to get a reference to the query.
const ref = getUserRef(getUserVars);
// Variables can be defined inline as well.
const ref = getUserRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserRef(dataConnect, getUserVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## ListBookings
You can execute the `ListBookings` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listBookings(options?: ExecuteQueryOptions): QueryPromise<ListBookingsData, undefined>;

interface ListBookingsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListBookingsData, undefined>;
}
export const listBookingsRef: ListBookingsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listBookings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListBookingsData, undefined>;

interface ListBookingsRef {
  ...
  (dc: DataConnect): QueryRef<ListBookingsData, undefined>;
}
export const listBookingsRef: ListBookingsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listBookingsRef:
```typescript
const name = listBookingsRef.operationName;
console.log(name);
```

### Variables
The `ListBookings` query has no variables.
### Return Type
Recall that executing the `ListBookings` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListBookingsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListBookings`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listBookings } from '@gobookme/sdk';


// Call the `listBookings()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listBookings();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listBookings(dataConnect);

console.log(data.bookings);

// Or, you can use the `Promise` API.
listBookings().then((response) => {
  const data = response.data;
  console.log(data.bookings);
});
```

### Using `ListBookings`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listBookingsRef } from '@gobookme/sdk';


// Call the `listBookingsRef()` function to get a reference to the query.
const ref = listBookingsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listBookingsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.bookings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.bookings);
});
```

## GetBookingById
You can execute the `GetBookingById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getBookingById(vars: GetBookingByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetBookingByIdData, GetBookingByIdVariables>;

interface GetBookingByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetBookingByIdVariables): QueryRef<GetBookingByIdData, GetBookingByIdVariables>;
}
export const getBookingByIdRef: GetBookingByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getBookingById(dc: DataConnect, vars: GetBookingByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetBookingByIdData, GetBookingByIdVariables>;

interface GetBookingByIdRef {
  ...
  (dc: DataConnect, vars: GetBookingByIdVariables): QueryRef<GetBookingByIdData, GetBookingByIdVariables>;
}
export const getBookingByIdRef: GetBookingByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getBookingByIdRef:
```typescript
const name = getBookingByIdRef.operationName;
console.log(name);
```

### Variables
The `GetBookingById` query requires an argument of type `GetBookingByIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetBookingByIdVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetBookingById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetBookingByIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetBookingById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getBookingById, GetBookingByIdVariables } from '@gobookme/sdk';

// The `GetBookingById` query requires an argument of type `GetBookingByIdVariables`:
const getBookingByIdVars: GetBookingByIdVariables = {
  id: ..., 
};

// Call the `getBookingById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getBookingById(getBookingByIdVars);
// Variables can be defined inline as well.
const { data } = await getBookingById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getBookingById(dataConnect, getBookingByIdVars);

console.log(data.booking);

// Or, you can use the `Promise` API.
getBookingById(getBookingByIdVars).then((response) => {
  const data = response.data;
  console.log(data.booking);
});
```

### Using `GetBookingById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getBookingByIdRef, GetBookingByIdVariables } from '@gobookme/sdk';

// The `GetBookingById` query requires an argument of type `GetBookingByIdVariables`:
const getBookingByIdVars: GetBookingByIdVariables = {
  id: ..., 
};

// Call the `getBookingByIdRef()` function to get a reference to the query.
const ref = getBookingByIdRef(getBookingByIdVars);
// Variables can be defined inline as well.
const ref = getBookingByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getBookingByIdRef(dataConnect, getBookingByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.booking);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.booking);
});
```

## GetUserCredentials
You can execute the `GetUserCredentials` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getUserCredentials(vars: GetUserCredentialsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserCredentialsData, GetUserCredentialsVariables>;

interface GetUserCredentialsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserCredentialsVariables): QueryRef<GetUserCredentialsData, GetUserCredentialsVariables>;
}
export const getUserCredentialsRef: GetUserCredentialsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserCredentials(dc: DataConnect, vars: GetUserCredentialsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserCredentialsData, GetUserCredentialsVariables>;

interface GetUserCredentialsRef {
  ...
  (dc: DataConnect, vars: GetUserCredentialsVariables): QueryRef<GetUserCredentialsData, GetUserCredentialsVariables>;
}
export const getUserCredentialsRef: GetUserCredentialsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserCredentialsRef:
```typescript
const name = getUserCredentialsRef.operationName;
console.log(name);
```

### Variables
The `GetUserCredentials` query requires an argument of type `GetUserCredentialsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserCredentialsVariables {
  userId: number;
}
```
### Return Type
Recall that executing the `GetUserCredentials` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserCredentialsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserCredentialsData {
  credentials: ({
    id: number;
    type: string;
    appId?: string | null;
    userId?: number | null;
  } & Credential_Key)[];
}
```
### Using `GetUserCredentials`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserCredentials, GetUserCredentialsVariables } from '@gobookme/sdk';

// The `GetUserCredentials` query requires an argument of type `GetUserCredentialsVariables`:
const getUserCredentialsVars: GetUserCredentialsVariables = {
  userId: ..., 
};

// Call the `getUserCredentials()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserCredentials(getUserCredentialsVars);
// Variables can be defined inline as well.
const { data } = await getUserCredentials({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserCredentials(dataConnect, getUserCredentialsVars);

console.log(data.credentials);

// Or, you can use the `Promise` API.
getUserCredentials(getUserCredentialsVars).then((response) => {
  const data = response.data;
  console.log(data.credentials);
});
```

### Using `GetUserCredentials`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserCredentialsRef, GetUserCredentialsVariables } from '@gobookme/sdk';

// The `GetUserCredentials` query requires an argument of type `GetUserCredentialsVariables`:
const getUserCredentialsVars: GetUserCredentialsVariables = {
  userId: ..., 
};

// Call the `getUserCredentialsRef()` function to get a reference to the query.
const ref = getUserCredentialsRef(getUserCredentialsVars);
// Variables can be defined inline as well.
const ref = getUserCredentialsRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserCredentialsRef(dataConnect, getUserCredentialsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.credentials);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.credentials);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation requires an argument of type `CreateUserVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserVariables {
  username: string;
  name?: string | null;
  email: string;
  uid: string;
  uuid: UUIDString;
  created: TimestampString;
}
```
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser, CreateUserVariables } from '@gobookme/sdk';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  username: ..., 
  name: ..., // optional
  email: ..., 
  uid: ..., 
  uuid: ..., 
  created: ..., 
};

// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser(createUserVars);
// Variables can be defined inline as well.
const { data } = await createUser({ username: ..., name: ..., email: ..., uid: ..., uuid: ..., created: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect, createUserVars);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser(createUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef, CreateUserVariables } from '@gobookme/sdk';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  username: ..., 
  name: ..., // optional
  email: ..., 
  uid: ..., 
  uuid: ..., 
  created: ..., 
};

// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef(createUserVars);
// Variables can be defined inline as well.
const ref = createUserRef({ username: ..., name: ..., email: ..., uid: ..., uuid: ..., created: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect, createUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

