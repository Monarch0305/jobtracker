"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Application } from "@/types";

interface KanbanCardProps {
    application: Application;
    index: number;
    onClick: (app: Application) => void;
}

const priorityColors: Record<string, string> = {
    HIGH: "bg-red-900/50 text-red-300 border-red-800",
    MEDIUM: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
    LOW: "bg-green-900/50 text-green-300 border-green-800",
};

export default function KanbanCard({
    application,
    index,
    onClick,
}: KanbanCardProps) {
    const appliedDate = new Date(application.appliedAt).toLocaleDateString(
        "en-IN",
        { month: "short", day: "numeric" }
    );

    return (
        <Draggable draggableId={application.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick(application)}
                    className={`bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-gray-600 transition-colors ${snapshot.isDragging ? "shadow-lg shadow-black/50 border-blue-600" : ""
                        }`}
                >
                    <p className="text-sm font-medium text-white truncate">
                        {application.company}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                        {application.role}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{appliedDate}</span>
                        {application.priority !== "MEDIUM" && (
                            <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[application.priority]
                                    }`}
                            >
                                {application.priority.toLowerCase()}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}