import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

// 模拟项目数据 - 实际项目中可从API获取
const mockProjects = [
    { id: '1', name: '项目 1' },
    { id: '2', name: '项目 2' },
    { id: '3', name: '项目 3' },
    { id: '4', name: '项目 4' },
    { id: '5', name: '项目 5' },
    { id: '6', name: '项目 6' },
    { id: '7', name: '项目 7' },
    { id: '8', name: '项目 8' },
    { id: '9', name: '项目 9' },
]

export default function HomePage() {
    const navigate = useNavigate()
    const [projects] = useState(mockProjects)

    // 处理项目卡片点击
    const handleProjectClick = (projectId: string) => {
        navigate(`/canvas/${projectId}`)
    }

    // 处理新建项目
    const handleCreateProject = () => {
        const newId = String(projects.length + 1)
        navigate(`/canvas/${newId}`)
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* 页面标题 */}
            <h1 className="text-2xl font-bold text-gray-800 mb-6">我的项目</h1>

            {/* Grid布局 - 响应式展示项目卡片 */}
            <div className="
                grid 
                grid-cols-2 
                sm:grid-cols-3 
                md:grid-cols-4 
                lg:grid-cols-5 
                xl:grid-cols-6 
                2xl:grid-cols-8
                gap-4
            ">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className="
                            aspect-square 
                            bg-white 
                            rounded-lg 
                            shadow-sm 
                            border border-gray-200 
                            cursor-pointer 
                            hover:shadow-md 
                            hover:border-blue-300 
                            transition-all
                            flex items-center justify-center
                            p-4
                        "
                    >
                        <span className="text-lg font-medium text-gray-700">
                            {project.id}
                        </span>
                    </div>
                ))}
            </div>

            {/* 右下角新建项目按钮 */}
            <button
                onClick={handleCreateProject}
                className="
                    fixed 
                    bottom-6 
                    right-6 
                    w-14 
                    h-14 
                    bg-blue-500 
                    text-white 
                    rounded-full 
                    shadow-lg 
                    hover:bg-blue-600 
                    hover:shadow-xl 
                    transition-all
                    flex items-center justify-center
                    z-50
                "
                title="新建项目"
            >
                <Plus size={24} />
            </button>
        </div>
    )
}