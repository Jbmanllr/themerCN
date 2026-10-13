"use client";

import { create } from "zustand";
import type { AIMessage, AIChatStore } from "../types";

export const useAIStore = create<AIChatStore>((set, get) => ({
  // State
  messages: [],
  isLoading: false,
  error: null,
  currentInput: "",
  uploadedImages: [],

  // Actions
  addMessage: (message: AIMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: (id: string, updates: Partial<AIMessage>) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg,
      ),
    }));
  },

  removeMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }));
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },

  setInput: (input: string) => {
    set({ currentInput: input });
  },

  addImage: (image: string) => {
    set((state) => ({
      uploadedImages: [...state.uploadedImages, image],
    }));
  },

  removeImage: (index: number) => {
    set((state) => ({
      uploadedImages: state.uploadedImages.filter((_, i) => i !== index),
    }));
  },

  clearImages: () => {
    set({ uploadedImages: [] });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Helper to get message by ID
  getMessage: (id: string) => {
    return get().messages.find((msg) => msg.id === id) ?? null;
  },

  // Reset all state
  reset: () => {
    set({
      messages: [],
      isLoading: false,
      error: null,
      currentInput: "",
      uploadedImages: [],
    });
  },
}));
