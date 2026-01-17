import axios, { type AxiosInstance } from "axios";


const axiosClient: AxiosInstance = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});