import {useState} from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    AppBar,
    Toolbar,
    IconButton,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress
} from '@mui/material';
import {
    Folder,
    InsertDriveFile,
    Share,
    Cloud,
    Settings,
    AccountCircle,
    Menu,
    Search,
    Refresh,
    MoreVert,
    GridView,
    DarkMode
} from '@mui/icons-material';
import './App.css';

function App() {
    const [darkMode, setDarkMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState('我的文件');

    return (
        <Box sx={{display: 'flex', height: '100vh', backgroundColor: '#F5F5F5'}}>
            {/* 侧边栏 */}
            <Drawer
                variant="permanent"
                sx={{
                    width: 240,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 240,
                        boxSizing: 'border-box',
                        backgroundColor: '#F5F5F5',
                        borderRadius: '30px',
                        margin: '8px 24px 8px 8px',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                <Box sx={{p: 2, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <img src="https://res.oplist.org/logo/120x120.webp" alt="logo" style={{width: '40px', height: '40px', marginRight: '8px'}} />
                    <Typography variant="h6">OpenList</Typography>
                </Box>
                <Divider/>
                <List sx={{flexGrow: 1}}>
                    {[
                        '公共目录', '我的文件', '我的分享',
                        '挂载连接', '后台任务', '离线下载', '账号设置'].map((text, index) => (
                        <ListItem
                            key={text}
                            component="li"
                            onClick={() => setSelectedItem(text)}
                            sx={{
                                backgroundColor: selectedItem === text ? '#BAD5F1' : 'transparent',
                                borderRadius: '20px',
                                margin: '4px',
                                width: '90%',
                            }}
                        >
                            <ListItemIcon>
                                {index === 0 ? <Folder/> : index === 1 ? <InsertDriveFile/> : index === 2 ?
                                    <Share/> : index === 3 ? <Cloud/> : index === 4 ? <Settings/> : <AccountCircle/>}
                            </ListItemIcon>
                            <ListItemText primary={text}/>
                        </ListItem>
                    ))}
                </List>
                <Divider/>
                <Box sx={{p: 2, backgroundColor: 'white', borderRadius: '30px', margin: '8px', mt: 'auto', mb: '30px'}}>
                    <Typography variant="body2">存储空间</Typography>
                    <LinearProgress variant="determinate" value={50} sx={{mt: 1}}/>
                    <Typography variant="caption">5GB / 10GB</Typography>
                </Box>
            </Drawer>

            {/* 主内容区域 */}
            <Box component="main" sx={{
                flexGrow: 1,
                // width: '100%',
                // height: '100vh',
                "margin-top": '10px',
                overflow: 'hidden',
                backgroundColor: '#F5F5F5',
                borderRadius: '30px',
                "margin-left": '24px'
            }}>
                {/* 标题栏 */}
                <AppBar position="static" sx={{mb: 2, borderRadius: '30px'}}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" aria-label="menu" sx={{mr: 2}}>
                            <Menu/>
                        </IconButton>
                        <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                            我的文件 {'>'} /
                        </Typography>
                        <IconButton color="inherit" aria-label="search">
                            <Search/>
                        </IconButton>
                        <IconButton color="inherit" aria-label="refresh">
                            <Refresh/>
                        </IconButton>
                        <IconButton color="inherit" aria-label="more">
                            <MoreVert/>
                        </IconButton>
                        <IconButton color="inherit" aria-label="view">
                            <GridView/>
                        </IconButton>
                        <IconButton color="inherit" aria-label="dark mode" onClick={() => setDarkMode(!darkMode)}>
                            <DarkMode/>
                        </IconButton>
                        <IconButton color="inherit" aria-label="account">
                            <AccountCircle/>
                        </IconButton>
                    </Toolbar>
                </AppBar>

                {/* 文件列表 */}
                <TableContainer component={Paper} sx={{height: 'calc(100% - 64px)', borderRadius: '20px'}}>
                    <Table sx={{minWidth: 650}} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>文件名</TableCell>
                                <TableCell align="right">大小</TableCell>
                                <TableCell align="right">修改日期</TableCell>
                                <TableCell align="right">所有者</TableCell>
                                <TableCell align="right">权限</TableCell>
                                <TableCell align="right">标记</TableCell>
                                <TableCell align="right">操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[1, 2, 3].map((row) => (
                                <TableRow key={row}>
                                    <TableCell component="th" scope="row">
                                        文件{row}
                                    </TableCell>
                                    <TableCell align="right">1MB</TableCell>
                                    <TableCell align="right">2025-09-18</TableCell>
                                    <TableCell align="right">admin</TableCell>
                                    <TableCell align="right">755</TableCell>
                                    <TableCell align="right">加密</TableCell>
                                    <TableCell align="right">
                                        <Button size="small">复制</Button>
                                        <Button size="small">分享</Button>
                                        <Button size="small">下载</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
}

export default App;