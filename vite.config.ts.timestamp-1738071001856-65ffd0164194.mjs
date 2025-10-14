// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/vite@4.5.3_sass@1.77.6/node_modules/vite/dist/node/index.js";
import AutoImport from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/unplugin-auto-import@0.16.7_@vueuse+core@10.11.0/node_modules/unplugin-auto-import/dist/vite.js";
import viteCompression from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/vite-plugin-compression@0.5.1_vite@4.5.3/node_modules/vite-plugin-compression/dist/index.mjs";
import Components from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/unplugin-vue-components@0.25.2_vue@3.4.31/node_modules/unplugin-vue-components/dist/vite.mjs";
import { ElementPlusResolver } from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/unplugin-vue-components@0.25.2_vue@3.4.31/node_modules/unplugin-vue-components/dist/resolvers.mjs";
import { visualizer } from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/rollup-plugin-visualizer@5.12.0/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import vue from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/@vitejs+plugin-vue@4.6.2_vite@4.5.3_vue@3.4.31/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { createSvgIconsPlugin } from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/vite-plugin-svg-icons@2.0.1_vite@4.5.3/node_modules/vite-plugin-svg-icons/dist/index.mjs";
import path from "path";
import tailwindcss from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/tailwindcss@3.4.4/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///C:/Users/86150/Downloads/ruyu-blog-master/ruyu-blog-master/blog-frontend/kuailemao-blog/node_modules/.pnpm/autoprefixer@10.4.19_postcss@8.4.39/node_modules/autoprefixer/lib/autoprefixer.js";
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [
      viteCompression({
        verbose: true,
        // 是否在控制台中输出压缩结果
        disable: false,
        threshold: 1024,
        // 如果体积大于阈值，将被压缩，单位为b，体积过小时请不要压缩，以免适得其反
        algorithm: "gzip",
        // 压缩算法，可选['gzip'，' brotliccompress '，'deflate '，'deflateRaw']
        ext: ".gz",
        // 源文件压缩后是否删除(亲测配置为true后浏览器会出现错误，除非nginx配置index  index.html index.htm;)
        // 具体出现问题参考：https://blog.csdn.net/zzk_01/article/details/125857217
        deleteOriginFile: false
      }),
      vue(),
      createSvgIconsPlugin({
        // 指定需要缓存的图标文件夹
        iconDirs: [path.resolve(process.cwd(), "src/assets/icons")],
        // 指定symbolId格式
        symbolId: "icon-[dir]-[name]"
      }),
      AutoImport({
        imports: ["vue", "vue-router", "pinia"],
        resolvers: [ElementPlusResolver()],
        dts: "src/types/auto-imports.d.ts"
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: "src/types/components.d.ts"
      }),
      // 打包体积分析
      visualizer({
        open: true,
        filename: "visualizer.html"
        //分析图生成的文件名
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve("./src")
        // 相对路径别名配置，使用 @ 代替 src
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          javascriptEnabled: true,
          additionalData: '@import "./src/styles/variable.scss";'
        }
      },
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer
        ]
      }
    },
    build: {
      rollupOptions: {
        // 配置打包文件分类输出
        output: {
          chunkFileNames: "js/[name]-[hash].js",
          // 引入文件名的名称
          entryFileNames: "js/[name]-[hash].js",
          // 包的入口文件名称
          assetFileNames: "[ext]/[name]-[hash].[ext]"
          // 资源文件像 字体，图片等
        },
        // 最小化拆分包， 将需要分离的包单独的打包出来
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id.toString().split("node_modules/")[1].split("/")[0].toString();
          }
        }
      }
    },
    server: {
      port: 99,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: `${loadEnv(mode, process.cwd()).VITE_SERVE}`,
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/api/, "")
        },
        "/wapi": {
          target: `${loadEnv(mode, process.cwd()).VITE_MUSIC_SERVE}`,
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/wapi/, "")
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFw4NjE1MFxcXFxEb3dubG9hZHNcXFxccnV5dS1ibG9nLW1hc3RlclxcXFxydXl1LWJsb2ctbWFzdGVyXFxcXGJsb2ctZnJvbnRlbmRcXFxca3VhaWxlbWFvLWJsb2dcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXDg2MTUwXFxcXERvd25sb2Fkc1xcXFxydXl1LWJsb2ctbWFzdGVyXFxcXHJ1eXUtYmxvZy1tYXN0ZXJcXFxcYmxvZy1mcm9udGVuZFxcXFxrdWFpbGVtYW8tYmxvZ1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvODYxNTAvRG93bmxvYWRzL3J1eXUtYmxvZy1tYXN0ZXIvcnV5dS1ibG9nLW1hc3Rlci9ibG9nLWZyb250ZW5kL2t1YWlsZW1hby1ibG9nL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHtDb25maWdFbnYsIGRlZmluZUNvbmZpZywgbG9hZEVudn0gZnJvbSAndml0ZSdcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gJ3VucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGUnXG5pbXBvcnQgdml0ZUNvbXByZXNzaW9uIGZyb20gJ3ZpdGUtcGx1Z2luLWNvbXByZXNzaW9uJztcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQge0VsZW1lbnRQbHVzUmVzb2x2ZXJ9IGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3Jlc29sdmVycydcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbi8vIFx1NUYxNVx1NTE2NXN2Z1x1OTcwMFx1ODk4MVx1NzUyOFx1NTIzMFx1NjNEMlx1NEVGNlxuaW1wb3J0IHtjcmVhdGVTdmdJY29uc1BsdWdpbn0gZnJvbSAndml0ZS1wbHVnaW4tc3ZnLWljb25zJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICd0YWlsd2luZGNzcydcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJ1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfTogQ29uZmlnRW52KSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgICAgdml0ZUNvbXByZXNzaW9uKHtcbiAgICAgICAgICAgICAgICB2ZXJib3NlOiB0cnVlLCAvLyBcdTY2MkZcdTU0MjZcdTU3MjhcdTYzQTdcdTUyMzZcdTUzRjBcdTRFMkRcdThGOTNcdTUxRkFcdTUzOEJcdTdGMjlcdTdFRDNcdTY3OUNcbiAgICAgICAgICAgICAgICBkaXNhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0aHJlc2hvbGQ6IDEwMjQsIC8vIFx1NTk4Mlx1Njc5Q1x1NEY1M1x1NzlFRlx1NTkyN1x1NEU4RVx1OTYwOFx1NTAzQ1x1RkYwQ1x1NUMwNlx1ODhBQlx1NTM4Qlx1N0YyOVx1RkYwQ1x1NTM1NVx1NEY0RFx1NEUzQWJcdUZGMENcdTRGNTNcdTc5RUZcdThGQzdcdTVDMEZcdTY1RjZcdThCRjdcdTRFMERcdTg5ODFcdTUzOEJcdTdGMjlcdUZGMENcdTRFRTVcdTUxNERcdTkwMDJcdTVGOTdcdTUxNzZcdTUzQ0RcbiAgICAgICAgICAgICAgICBhbGdvcml0aG06ICdnemlwJywgLy8gXHU1MzhCXHU3RjI5XHU3Qjk3XHU2Q0Q1XHVGRjBDXHU1M0VGXHU5MDA5WydnemlwJ1x1RkYwQycgYnJvdGxpY2NvbXByZXNzICdcdUZGMEMnZGVmbGF0ZSAnXHVGRjBDJ2RlZmxhdGVSYXcnXVxuICAgICAgICAgICAgICAgIGV4dDogJy5neicsXG4gICAgICAgICAgICAgICAgLy8gXHU2RTkwXHU2NTg3XHU0RUY2XHU1MzhCXHU3RjI5XHU1NDBFXHU2NjJGXHU1NDI2XHU1MjIwXHU5NjY0KFx1NEVCMlx1NkQ0Qlx1OTE0RFx1N0Y2RVx1NEUzQXRydWVcdTU0MEVcdTZENEZcdTg5QzhcdTU2NjhcdTRGMUFcdTUxRkFcdTczQjBcdTk1MTlcdThCRUZcdUZGMENcdTk2NjRcdTk3NUVuZ2lueFx1OTE0RFx1N0Y2RWluZGV4ICBpbmRleC5odG1sIGluZGV4Lmh0bTspXG4gICAgICAgICAgICAgICAgLy8gXHU1MTc3XHU0RjUzXHU1MUZBXHU3M0IwXHU5NUVFXHU5ODk4XHU1M0MyXHU4MDAzXHVGRjFBaHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3p6a18wMS9hcnRpY2xlL2RldGFpbHMvMTI1ODU3MjE3XG4gICAgICAgICAgICAgICAgZGVsZXRlT3JpZ2luRmlsZTogZmFsc2VcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgdnVlKCksXG4gICAgICAgICAgICBjcmVhdGVTdmdJY29uc1BsdWdpbih7XG4gICAgICAgICAgICAgICAgLy8gXHU2MzA3XHU1QjlBXHU5NzAwXHU4OTgxXHU3RjEzXHU1QjU4XHU3Njg0XHU1NkZFXHU2ODA3XHU2NTg3XHU0RUY2XHU1OTM5XG4gICAgICAgICAgICAgICAgaWNvbkRpcnM6IFtwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3NyYy9hc3NldHMvaWNvbnMnKV0sXG4gICAgICAgICAgICAgICAgLy8gXHU2MzA3XHU1QjlBc3ltYm9sSWRcdTY4M0NcdTVGMEZcbiAgICAgICAgICAgICAgICBzeW1ib2xJZDogJ2ljb24tW2Rpcl0tW25hbWVdJyxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgQXV0b0ltcG9ydCh7XG4gICAgICAgICAgICAgICAgaW1wb3J0czogWyd2dWUnLCAndnVlLXJvdXRlcicsICdwaW5pYSddLFxuICAgICAgICAgICAgICAgIHJlc29sdmVyczogW0VsZW1lbnRQbHVzUmVzb2x2ZXIoKV0sXG4gICAgICAgICAgICAgICAgZHRzOiBcInNyYy90eXBlcy9hdXRvLWltcG9ydHMuZC50c1wiLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBDb21wb25lbnRzKHtcbiAgICAgICAgICAgICAgICByZXNvbHZlcnM6IFtFbGVtZW50UGx1c1Jlc29sdmVyKCldLFxuICAgICAgICAgICAgICAgIGR0czogXCJzcmMvdHlwZXMvY29tcG9uZW50cy5kLnRzXCIsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIC8vIFx1NjI1M1x1NTMwNVx1NEY1M1x1NzlFRlx1NTIwNlx1Njc5MFxuICAgICAgICAgICAgdmlzdWFsaXplcih7XG4gICAgICAgICAgICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmaWxlbmFtZTogJ3Zpc3VhbGl6ZXIuaHRtbCcgLy9cdTUyMDZcdTY3OTBcdTU2RkVcdTc1MUZcdTYyMTBcdTc2ODRcdTY1ODdcdTRFRjZcdTU0MERcbiAgICAgICAgICAgIH0pXG4gICAgICAgIF0sXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShcIi4vc3JjXCIpIC8vIFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NFx1NTIyQlx1NTQwRFx1OTE0RFx1N0Y2RVx1RkYwQ1x1NEY3Rlx1NzUyOCBAIFx1NEVFM1x1NjZGRiBzcmNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY3NzOiB7XG4gICAgICAgICAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgc2Nzczoge1xuICAgICAgICAgICAgICAgICAgICBqYXZhc2NyaXB0RW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbERhdGE6ICdAaW1wb3J0IFwiLi9zcmMvc3R5bGVzL3ZhcmlhYmxlLnNjc3NcIjsnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9zdGNzczoge1xuICAgICAgICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgdGFpbHdpbmRjc3MsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9wcmVmaXhlcixcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgLy8gXHU5MTREXHU3RjZFXHU2MjUzXHU1MzA1XHU2NTg3XHU0RUY2XHU1MjA2XHU3QzdCXHU4RjkzXHU1MUZBXG4gICAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnanMvW25hbWVdLVtoYXNoXS5qcycsIC8vIFx1NUYxNVx1NTE2NVx1NjU4N1x1NEVGNlx1NTQwRFx1NzY4NFx1NTQwRFx1NzlGMFxuICAgICAgICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2pzL1tuYW1lXS1baGFzaF0uanMnLCAvLyBcdTUzMDVcdTc2ODRcdTUxNjVcdTUzRTNcdTY1ODdcdTRFRjZcdTU0MERcdTc5RjBcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdbZXh0XS9bbmFtZV0tW2hhc2hdLltleHRdJywgLy8gXHU4RDQ0XHU2RTkwXHU2NTg3XHU0RUY2XHU1MENGIFx1NUI1N1x1NEY1M1x1RkYwQ1x1NTZGRVx1NzI0N1x1N0I0OVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gXHU2NzAwXHU1QzBGXHU1MzE2XHU2MkM2XHU1MjA2XHU1MzA1XHVGRjBDIFx1NUMwNlx1OTcwMFx1ODk4MVx1NTIwNlx1NzlCQlx1NzY4NFx1NTMwNVx1NTM1NVx1NzJFQ1x1NzY4NFx1NjI1M1x1NTMwNVx1NTFGQVx1Njc2NVxuICAgICAgICAgICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWQudG9TdHJpbmcoKS5zcGxpdCgnbm9kZV9tb2R1bGVzLycpWzFdLnNwbGl0KCcvJylbMF0udG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2VydmVyOiB7XG4gICAgICAgICAgICBwb3J0OiA5OSxcbiAgICAgICAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICAgICAgICAgIHByb3h5OiB7XG4gICAgICAgICAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogYCR7bG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpKS5WSVRFX1NFUlZFfWAsXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sICcnKVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJy93YXBpJzoge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IGAke2xvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSkuVklURV9NVVNJQ19TRVJWRX1gLFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC93YXBpLywgJycpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9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
