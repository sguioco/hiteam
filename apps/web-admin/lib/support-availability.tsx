"use client";

import { createContext, useContext } from "react";

export const SupportAvailabilityContext = createContext(false);
export const useSupportEnabled = () => useContext(SupportAvailabilityContext);
