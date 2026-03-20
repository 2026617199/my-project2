// import { useCanvasStore } from '@/store/canvas'
import { Link } from 'react-router-dom'

export default function HomePage() {
    // let a = useCanvasStore()
    // console.log(a)
    // console.table(a)


    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6">
            <h1 className="text-3xl font-bold underline mb-8">Hello world!</h1>
            <Link
                to="/canvas"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
                进入画布
            </Link>
        </div>
    )
}