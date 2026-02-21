import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./baseapi";
import authReducer from "../auth/authSlice";

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
});