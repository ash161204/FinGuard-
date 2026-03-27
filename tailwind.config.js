/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./context/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#112236",
        mist: "#F5F7FB",
        aqua: "#68E1FD",
        teal: "#19C1B5",
        coral: "#FF8A65",
        gold: "#FFCB52",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(17, 34, 54, 0.12)",
      },
    },
  },
  plugins: [],
};
