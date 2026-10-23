/// <reference types="@tarojs/taro" />

declare function defineAppConfig(config: any): any
declare function definePageConfig(config: any): any

declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.svg'
declare module '*.css'

declare const __RECIPE_API_BASE__: string
declare const __RECIPE_USE_HTTP__: boolean

declare const __RECIPE_CLOUD_ENV__: string
