export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/checkin/index',
    'pages/recipe/index',
    'pages/checkin-edit/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FAF9F6',
    navigationBarTitleText: '开火日记',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FAF9F6'
  },
  tabBar: {
    color: '#9A9A9A',
    selectedColor: '#CF503D',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: '菜谱', iconPath: 'assets/tabbar/home.png', selectedIconPath: 'assets/tabbar/home-active.png' },
      { pagePath: 'pages/checkin/index', text: '日记', iconPath: 'assets/tabbar/checkin.png', selectedIconPath: 'assets/tabbar/checkin-active.png' },
    ]
  }
})
