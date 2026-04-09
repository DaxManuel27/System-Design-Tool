import { create } from 'zustand'
import { ChatState, ChatMessage } from '../types'

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  abortController: null,

  addMessage: (msg: ChatMessage) =>
    set(state => ({ messages: [...state.messages, msg] })),

  updateMessage: (id: string, updates: Partial<ChatMessage>) =>
    set(state => ({
      messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m),
    })),

  appendDelta: (id: string, delta: string) =>
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, content: m.content + delta } : m
      ),
    })),

  setLoading: (v: boolean) => set({ isLoading: v }),

  setAbortController: (c: AbortController | null) => set({ abortController: c }),

  clearMessages: () => set({ messages: [] }),
}))
