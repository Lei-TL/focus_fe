/**
 * GENERATED — không sửa tay; chạy pnpm gen:api
 *
 * Sinh từ OpenAPI của Focus_Be (contracts/openapi.json) bằng openapi-typescript.
 * BE contract commit: 9b6744e
 */

export interface paths {
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Log in with email and password */
        post: operations["WebApisEndpointsUserModuleLoginLoginEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the current user profile */
        get: operations["WebApisEndpointsUserModuleMeMeEndpoint"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rotate the refresh token for a new token pair */
        post: operations["WebApisEndpointsUserModuleRefreshRefreshEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register a new user account */
        post: operations["WebApisEndpointsUserModuleRegisterRegisterEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Service health check */
        get: operations["health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read a focus session by id */
        get: operations["WebApisEndpointsSessionModuleDetailDetailSessionEndpoint"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{id}/end": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** End a focus session */
        post: operations["WebApisEndpointsSessionModuleEndEndSessionEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Record a batch of session events */
        post: operations["WebApisEndpointsSessionModuleEventsRecordSessionEventsEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the owner's active focus session */
        get: operations["WebApisEndpointsSessionModuleCurrentCurrentSessionEndpoint"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Start a focus session */
        post: operations["WebApisEndpointsSessionModuleStartStartSessionEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List work items with paging and filters */
        get: operations["WebApisEndpointsWorkItemModuleListListWorkItemsEndpoint"];
        put?: never;
        /** Create a work item */
        post: operations["WebApisEndpointsWorkItemModuleCreateCreateWorkItemEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a work item with its dependencies */
        get: operations["WebApisEndpointsWorkItemModuleDetailGetWorkItemEndpoint"];
        /** Replace a work item */
        put: operations["WebApisEndpointsWorkItemModuleUpdateUpdateWorkItemEndpoint"];
        post?: never;
        /** Delete a work item */
        delete: operations["WebApisEndpointsWorkItemModuleDeleteDeleteWorkItemEndpoint"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items/{id}/dependencies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add a dependency between work items */
        post: operations["WebApisEndpointsWorkItemModuleDependenciesAddDependencyEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items/{id}/dependencies/{dependsOnWorkItemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remove a dependency between work items */
        delete: operations["WebApisEndpointsWorkItemModuleDependenciesRemoveDependencyEndpoint"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Change a work item status */
        patch: operations["WebApisEndpointsWorkItemModuleStatusChangeStatusEndpoint"];
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AddDependencyRequest: {
            /** Format: guid */
            dependsOnWorkItemId?: string;
        };
        ChangeStatusRequest: {
            /** @enum {string} */
            status: "Open" | "Done" | "Archived";
        };
        CreateWorkItemRequest: {
            /** @enum {string} */
            complexity: "S" | "M" | "L" | "XL";
            /** Format: date-time */
            deadline?: string | null;
            description?: string | null;
            title: string;
            /** @enum {string} */
            type: "Analysis" | "Design" | "Coding" | "Testing" | "Debugging" | "CodeReview" | "Refactor" | "Documentation" | "Learning";
            /** Format: int32 */
            userEstimateMinutes?: number | null;
        };
        CurrentSession: {
            /** Format: int32 */
            plannedSeconds: number;
            /** Format: date-time */
            serverNow: string;
            /** Format: date-time */
            serverStartTime: string;
            /** Format: guid */
            sessionId: string;
            /** @enum {string} */
            status: "Active" | "Completed" | "Cancelled";
            /** Format: guid */
            workItemId: string;
        };
        DeleteWorkItemRequest: Record<string, never>;
        DependencyDetail: {
            /** Format: guid */
            dependsOnWorkItemId: string;
            /** Format: guid */
            workItemId: string;
        };
        DetailSessionRequest: Record<string, never>;
        EndedSessionDetail: {
            /** Format: int32 */
            grossSeconds: number;
            /** Format: int32 */
            plannedSeconds: number;
            /** Format: date-time */
            serverEndTime: string;
            /** Format: date-time */
            serverStartTime: string;
            /** Format: guid */
            sessionId: string;
            /** @enum {string} */
            status: "Active" | "Completed" | "Cancelled";
            /** Format: guid */
            workItemId: string;
        };
        EndSessionRequest: {
            /** @enum {string} */
            reason: "Completed" | "Cancelled";
        };
        GetWorkItemRequest: Record<string, never>;
        HttpValidationProblemDetails: components["schemas"]["ProblemDetails"] & ({
            errors?: {
                [key: string]: string[];
            };
        } & {
            [key: string]: unknown;
        });
        ListWorkItemsRequest: Record<string, never>;
        LoginRequest: {
            /** Format: email */
            email: string;
            password: string;
        };
        PagedResultOfWorkItemDetail: {
            items: components["schemas"]["WorkItemDetail"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
        };
        ProblemDetails: {
            detail?: string | null;
            instance?: string | null;
            /** Format: int32 */
            status?: number | null;
            title?: string | null;
            type?: string | null;
        } & {
            [key: string]: unknown;
        };
        RecordedEvents: {
            /** Format: int32 */
            duplicateCount: number;
            /** Format: int32 */
            insertedCount: number;
            /** Format: int32 */
            receivedCount: number;
        };
        RecordSessionEventsRequest: {
            events: components["schemas"]["SessionEventInput"][];
        };
        RefreshRequest: {
            refreshToken: string;
        };
        RegisterRequest: {
            /** Format: int32 */
            defaultSessionMinutes?: number;
            displayName: string;
            /** Format: email */
            email: string;
            password: string;
            timeZoneId: string;
        };
        RemoveDependencyRequest: Record<string, never>;
        SessionDetail: {
            /** Format: int32 */
            plannedSeconds: number;
            /** Format: date-time */
            serverStartTime: string;
            /** Format: guid */
            sessionId: string;
            /** @enum {string} */
            status: "Active" | "Completed" | "Cancelled";
            /** Format: guid */
            workItemId: string;
        };
        SessionEventInput: {
            /** Format: guid */
            clientEventId: string;
            /** Format: date-time */
            clientTs: string;
            /** @enum {string} */
            source: "Device" | "VsCode";
            /** @enum {string} */
            type: "Heartbeat" | "Foreground" | "Background" | "Killed";
        };
        SessionRead: {
            /** Format: int32 */
            grossSeconds: number | null;
            /** Format: int32 */
            plannedSeconds: number;
            /** Format: date-time */
            serverEndTime: string | null;
            /** Format: date-time */
            serverStartTime: string;
            /** Format: guid */
            sessionId: string;
            /** @enum {string} */
            status: "Active" | "Completed" | "Cancelled";
            /** Format: guid */
            workItemId: string;
        };
        StartSessionRequest: {
            /** Format: int32 */
            plannedSeconds?: number | null;
            /** Format: guid */
            workItemId: string;
        };
        TokenPair: {
            /** Format: date-time */
            accessExpiresAt: string;
            accessToken: string;
            /** Format: date-time */
            refreshExpiresAt: string;
            refreshToken: string;
        };
        UpdateWorkItemRequest: {
            /** @enum {string} */
            complexity: "S" | "M" | "L" | "XL";
            /** Format: date-time */
            deadline?: string | null;
            description?: string | null;
            title: string;
            /** @enum {string} */
            type: "Analysis" | "Design" | "Coding" | "Testing" | "Debugging" | "CodeReview" | "Refactor" | "Documentation" | "Learning";
            /** Format: int32 */
            userEstimateMinutes?: number | null;
        };
        UserProfile: {
            /** Format: int32 */
            defaultSessionMinutes: number;
            displayName: string;
            email: string;
            /** Format: guid */
            id: string;
            /** @enum {string} */
            role: "User" | "Admin";
            /** Format: int64 */
            seed: number;
            timeZoneId: string;
        };
        WorkItemDetail: {
            /** Format: date-time */
            closedAt: string | null;
            /** @enum {string} */
            complexity: "S" | "M" | "L" | "XL";
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            deadline: string | null;
            description: string | null;
            /** Format: guid */
            id: string;
            /** @enum {string} */
            status: "Open" | "Done" | "Archived";
            title: string;
            /** @enum {string} */
            type: "Analysis" | "Design" | "Coding" | "Testing" | "Debugging" | "CodeReview" | "Refactor" | "Documentation" | "Learning";
            /** Format: date-time */
            updatedAt: string;
            /** Format: int32 */
            userEstimateMinutes: number | null;
        };
        WorkItemDetailWithLinks: {
            /** Format: date-time */
            closedAt: string | null;
            /** @enum {string} */
            complexity: "S" | "M" | "L" | "XL";
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            deadline: string | null;
            dependsOnWorkItemIds: string[];
            description: string | null;
            /** Format: guid */
            id: string;
            /** @enum {string} */
            status: "Open" | "Done" | "Archived";
            title: string;
            /** @enum {string} */
            type: "Analysis" | "Design" | "Coding" | "Testing" | "Debugging" | "CodeReview" | "Refactor" | "Documentation" | "Learning";
            /** Format: date-time */
            updatedAt: string;
            /** Format: int32 */
            userEstimateMinutes: number | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    WebApisEndpointsUserModuleLoginLoginEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenPair"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsUserModuleMeMeEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserProfile"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsUserModuleRefreshRefreshEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenPair"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsUserModuleRegisterRegisterEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserProfile"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Email already registered */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Healthy */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        status: string;
                    };
                };
            };
            /** @description Unhealthy */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        status: string;
                    };
                };
            };
        };
    };
    WebApisEndpointsSessionModuleDetailDetailSessionEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionRead"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsSessionModuleEndEndSessionEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EndSessionRequest"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EndedSessionDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsSessionModuleEventsRecordSessionEventsEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordSessionEventsRequest"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecordedEvents"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Session is already closed */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsSessionModuleCurrentCurrentSessionEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrentSession"];
                };
            };
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsSessionModuleStartStartSessionEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartSessionRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Work item is not open or an active session already exists */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleListListWorkItemsEndpoint: {
        parameters: {
            query?: {
                /** @description Page number (default 1, minimum 1) */
                page?: number;
                /** @description Page size (default 20, minimum 1, maximum 100) */
                pageSize?: number;
                /** @description Filter by work item status (default: all) */
                status?: "Open" | "Done" | "Archived" | null;
                /** @description Filter by task type (default: all) */
                type?: "Analysis" | "Design" | "Coding" | "Testing" | "Debugging" | "CodeReview" | "Refactor" | "Documentation" | "Learning" | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedResultOfWorkItemDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleCreateCreateWorkItemEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWorkItemRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleDetailGetWorkItemEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemDetailWithLinks"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleUpdateUpdateWorkItemEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateWorkItemRequest"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleDeleteDeleteWorkItemEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Work item has sessions and cannot be deleted */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleDependenciesAddDependencyEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddDependencyRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DependencyDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Dependency already exists */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleDependenciesRemoveDependencyEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dependsOnWorkItemId: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WebApisEndpointsWorkItemModuleStatusChangeStatusEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangeStatusRequest"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HttpValidationProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
