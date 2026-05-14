# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createUser, listUsers, listTeams, getUser, listBookings, getBookingById, getUserCredentials } from '@gobookme/sdk';


// Operation CreateUser:  For variables, look at type CreateUserVars in ../index.d.ts
const { data } = await CreateUser(dataConnect, createUserVars);

// Operation ListUsers: 
const { data } = await ListUsers(dataConnect);

// Operation ListTeams: 
const { data } = await ListTeams(dataConnect);

// Operation GetUser:  For variables, look at type GetUserVars in ../index.d.ts
const { data } = await GetUser(dataConnect, getUserVars);

// Operation ListBookings: 
const { data } = await ListBookings(dataConnect);

// Operation GetBookingById:  For variables, look at type GetBookingByIdVars in ../index.d.ts
const { data } = await GetBookingById(dataConnect, getBookingByIdVars);

// Operation GetUserCredentials:  For variables, look at type GetUserCredentialsVars in ../index.d.ts
const { data } = await GetUserCredentials(dataConnect, getUserCredentialsVars);


```