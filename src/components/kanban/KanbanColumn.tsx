"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Application, ApplicationStatus } from "@/types";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
    status: ApplicationStatus;
    applications: Application[];
    onCardClick: (app: Application) => void;
}

const statusConfig: Record<
    ApplicationStatus,
    { label: string; color: string; bgColor: string }
> = {
    REJECTED: { label: "Rejected", color: "text-red-400", bgColor: "bg-red-900/30" },
    WISHLIST: { label: "Wishlist", color: "text-gray-400", bgColor: "bg-gray-800/50" },
    APPLIED: { label: "Applied", color: "text-blue-400", bgColor: "bg-blue-900/30" },
    SCREENING: { label: "Screening", color: "text-yellow-400", bgColor: "bg-yellow-900/30" },
    INTERVIEW: { label: "Interview", color: "text-teal-400", bgColor: "bg-teal-900/30" },
    OFFER: { label: "Offer", color: "text-green-400", bgColor: "bg-green-900/30" },
    ACCEPTED: { label: "Accepted", color: "text-purple-400", bgColor: "bg-purple-900/30" },
};

export default function KanbanColumn({
    status,
    applications,
    onCardClick,
}: KanbanColumnProps) {
    const config = statusConfig[status];

    return (
        <div className="flex flex-col w-56 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                    {applications.length}
                </span>
            </div>

            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-2 p-2 rounded-lg min-h-[200px] transition-colors ${snapshot.isDraggingOver
                                ? "bg-gray-800/80 border border-dashed border-gray-600"
                                : "bg-gray-900/50"
                            }`}
                    >
                        {applications.map((app, index) => (
                            <KanbanCard
                                key={app.id}
                                application={app}
                                index={index}
                                onClick={onCardClick}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}