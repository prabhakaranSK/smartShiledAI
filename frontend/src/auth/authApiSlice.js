import { baseApi } from "../api/baseapi";

export const authApiSlice = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        loginUser: builder.mutation({
            query: (userData) => ({
                url: "/auth/login",
                method: "POST",
                body: userData,
            }),
        }),

        signupUser: builder.mutation({
            query: (userData) => ({
                url: "/auth/signup",
                method: "POST",
                body: userData,
            }),
        }),

        uploadContract: builder.mutation({
            query: (file) => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("detailed", true);

                return {
                    url: "/scan/upload",
                    method: "POST",
                    body: formData,
                };
            },
        }),

        getReport: builder.query({
            query: (reportId) => `/scan/report/${reportId}`,
        }),

        downloadReport: builder.query({
            query: (reportId) => ({
                url: `/scan/report/${reportId}/download`,
                responseHandler: (response) => response.blob(),
            }),
        }),
    }),
});

export const {
    useLoginUserMutation,
    useSignupUserMutation,
    useUploadContractMutation,
    useGetReportQuery,
    useLazyDownloadReportQuery,
} = authApiSlice;